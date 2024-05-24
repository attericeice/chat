const APIError = require('../errors/APIError');
const MessageService = require('./MessageService');
const DialogService = require('./DialogService');
const ContactService = require('./ContactService');
const NotificationService = require('./NotificationService');
const UserService = require('./UserService');
const TokenService = require('./TokenService');

class SocketService {
    constructor(io) {
        this.io = io;
    } 
    initializeEvents(){
        this.io.on('connection', (socket) => {
          socket.on('join', room => {
          socket.join(room);
          console.log('Подключение к ' + room);
          });
          socket.on('leave', room => {
            socket.leave(room);
            console.log('Отключение от  ' + room);
          });
          socket.on('message', async (message) => {
             const newMessage = await MessageService.createMessage(message);
             const dialogUsers = await DialogService.getDialogUsers(newMessage.dialogId);
             this.io.to(message.data.dialogId.toString()).emit('newMessage', newMessage);
              await Promise.all(dialogUsers.map(async user => {
              const updatedDialog = await DialogService.getUpdatedDialogState(newMessage.dialogId, user.id);
              this.io.to(user.link).emit('updateDialog', updatedDialog);
            }));
            socket.emit('actionSuccess');
          });
          socket.on('removeMessagesForSelf', async ({messagesIds, userId, room}) => {
            const [removingForAll, removingForSelf] = await MessageService.removeForSelf(messagesIds, userId, room);
            if (removingForAll.length) socket.broadcast.to(room).emit('removeMessages', removingForAll);
            socket.emit('removeMessages', removingForSelf);
            const users = await DialogService.getDialogUsers(room);
            await Promise.all(users.map(async user => {
              const updatedDialog = await DialogService.getUpdatedDialogState(room, user.id);
              this.io.to(user.link).emit('updateDialog', updatedDialog);
            }));
          });
          socket.on('removeMessagesForAll', async ({messagesIds, userId, room}) => {
            await MessageService.removeForAll(messagesIds);
            this.io.to(room).emit('removeMessages', messagesIds);
            const users = await DialogService.getDialogUsers(room);
            await Promise.all(users.map(async user => {
              const updatedDialog = await DialogService.getUpdatedDialogState(room, user.id);
              this.io.to(user.link).emit('updateDialog', updatedDialog);
            }));
          });
          socket.on('updateMessage', async ({message, room}) => {
            const updatedMessage = await MessageService.updateMessage(message);
            this.io.to(room).emit('updateMessage', updatedMessage);
            socket.emit('actionSuccess');
          });
          socket.on('readMessage', async ({messageId, userId, dialogId}) => {
              const readMessageId = await MessageService.readMessage(messageId, userId, dialogId);
              this.io.to(dialogId.toString()).emit('updateMessageStatus', readMessageId);
              socket.emit('unreadDecrement', dialogId);
          });
          socket.on('startTyping', ({room, id, name}) => {
            socket.broadcast.to(room).emit('startTyping', {id, name});
          });
          socket.on('endTyping', ({room, id, name}) => {
            socket.broadcast.to(room).emit('endTyping', {id, name});
          });
          socket.on('removeContactRequest', async ({rooms, contactRequest}) => {
          const removeContactRequest = await ContactService.cancleContactRequest(contactRequest);
          rooms.forEach(room => {
          const type = room == contactRequest.senderId ? 'self' : 'other';
          const event = room === contactRequest.senderId ? 'removeSelfRequest' : 'removeOtherRequest';
          const emitRoom = event === 'removeOtherRequest' ? `contact_request/other/${room}` : `contact_request/self/${room}`;
          this.io.to(`profile/${room}`).emit('removeContactRequest', contactRequest);
          this.io.to(emitRoom).emit(event, contactRequest);
          this.io.to(`search/${room}`).emit('removeSearchRequest', {type, contactRequest});
          });
          });
          socket.on('sendContactRequest', async ({rooms, senderId, userId}) => {
          const {contactRequest, contactRequestUsers} = await ContactService.createContactRequest(senderId, userId);
          rooms.forEach(room => {
          const type = room == senderId ? 'sentRequest' : 'receiverRequest';
          const user = contactRequestUsers.find(user => user.id !== room);
          const event = room === senderId ? 'addSelfRequest' : 'addOtherRequest';
          const emitRoom = event === 'addSelfRequest' ? `contact_request/self/${room}` : `contact_request/other/${room}`;
          this.io.to(`profile/${room}`).emit('sendContactRequest', {type, contactRequest});
          this.io.to(emitRoom).emit(event, {...contactRequest.dataValues, user});
          this.io.to(`search/${room}`).emit('sendSearchRequest', {type, contactRequest});
          console.log(`Отправляю в комнату ${emitRoom} ${event}`);
          });
          });
          socket.on('confirmContactRequest', async ({rooms, contactRequest}) => {
          const {createdContact, contactUsers} = await ContactService.confirmContactRequest(contactRequest);
          rooms.forEach(room => {
          const contactUser = contactUsers.filter(user => user.id != room);
          const event = room == contactRequest.senderId ? 'removeSelfRequest' : 'removeOtherRequest';
          const emitRoom = event === 'removeSelfRequest' ? `contact_request/self/${room}` : `contact_request/other/${room}`;
          this.io.to(emitRoom).emit(event, contactRequest);
          this.io.to(`profile/${room}`).emit('confirmContactRequest', createdContact);
          this.io.to(`contacts/${room}`).emit('addContact', {...createdContact.dataValues, contact: contactUser[0]});
          this.io.to(`search/${room}`).emit('confirmSearchRequest', createdContact);
          });
          });
          socket.on('removeContact', async ({rooms, userId, contactId}) => {
          const removedContact = await ContactService.removeContact(userId, contactId);
          rooms.forEach(room => {
          this.io.to(`profile/${room}`).emit('removeContact', {userId, contactId});
          this.io.to(`contacts/${room}`).emit('removeHeaderContact', {userId, contactId});
          this.io.to(`search/${room}`).emit('removeSearchContact', {userId, contactId});
          });
          });
          socket.on('sendNotification', async notification => {
          const createdNotification = await NotificationService.createNotification(notification);
          const userLink = await UserService.getUserLink(createdNotification.userId);
          this.io.to(userLink).emit('newNotification', createdNotification);
          this.io.to(userLink).emit('incrementNotification', 1);
          });
          socket.on('removeNotifications', async selectedNotifications => {
             await NotificationService.removeNotification(selectedNotifications);
             socket.emit('removeNotifications', selectedNotifications);
             socket.emit('decrementNotification', selectedNotifications.length);
          });
          socket.on('userOnline', async user => {
          const [dialogs, contacts] = await UserService.getUserStatusRecipients(user.id);
          await UserService.updateUserStatus(user.id, 'online');
          dialogs.forEach(dialog => {
          socket.broadcast.to(dialog.dialogId.toString()).emit('userOnlineChat');
          this.io.to(dialog.link).emit('userOnline', dialog.dialogId);
          });
          contacts.forEach(contact => {
          this.io.to(`contacts/${contact}`).emit('userOnlineContacts', user.id);
          });
          this.io.to(`profile/${user.id}`).emit('userOnlineProfile');
          });
          socket.on('userOffline', async token => {
         const user = TokenService.validateAccessToken(token);
         if (user) {
         const [dialogs, contacts] = await UserService.getUserStatusRecipients(user.id);
         await UserService.updateUserStatus(user.id, 'offline');
         dialogs.forEach(dialog => {
         socket.broadcast.to(dialog.dialogId.toString()).emit('userOfflineChat');
         this.io.to(dialog.link).emit('userOffline', dialog.dialogId);
         });
         contacts.forEach(contact => {
         this.io.to(`contacts/${contact}`).emit('userOfflineContacts', user.id);
         });
         this.io.to(`profile/${user.id}`).emit('userOfflineProfile');
             }
          });
          socket.on('addToBlackList', async ({senderId, bannedId}) => {
              const [dialog, users, blacklist] = await UserService.addToBlackList(senderId, bannedId);
              if (dialog) {
                this.io.to(dialog.id.toString()).emit('addBlackList', blacklist);
              }
              users.forEach(item => {
                const event = item.id === senderId ? 'addBlackListSender' : 'addBlackListBanned';
                if (event === 'addBlackListSender') {
                  this.io.to(item.link).emit('addBlackListSelf', blacklist);
                }
                if (dialog) {
                  this.io.to(item.link).emit(event, {blacklist, dialogId: dialog.id});
                }
                this.io.to(`profile/${item.id}`).emit(event, blacklist);
                this.io.to(`profile/${item.id}`).emit('removeContact', {userId: senderId, contactId: bannedId});
                this.io.to(`contacts/${item.id}`).emit('removeHeaderContact', {userId: senderId, contactId: bannedId});
                this.io.to(`contact_request/self/${item.id}`).emit('requestBlacklistSelf', {senderId, bannedId});
                this.io.to(`contact_request/other/${item.id}`).emit('requestBlacklistOther', {senderId, bannedId});
                if (event === 'addBlackListBanned') {
                  this.io.to(`search/${item.id}`).emit('removeSearchItem', {senderId, bannedId});
                } else {
                  this.io.to(`search/${item.id}`).emit('addSearchBlackList', blacklist);
                }
              });
          });
          socket.on('removeBlackList', async blacklist => {
            const [dialog, users] = await UserService.removeFromBlackList(blacklist);
            if (dialog) {
              this.io.to(dialog.id.toString()).emit('removeBlackList', blacklist);
            }
            users.forEach(user => {
               const event = user.id === blacklist.senderId ? 'removeBlackListSender' : 'removeBlackListBanned';
               if (event === 'removeBlackListSender') {
                this.io.to(user.link).emit('removeBlackListSelf', blacklist.id);
               }
               if (dialog) {
                this.io.to(user.link).emit(event, {blacklist, dialogId: dialog.id});
               }
               if (event === 'removeBlackListSender') {
                this.io.to(`search/${user.id}`).emit('removeSearchBlackList', blacklist.bannedId);
               }
            });
            this.io.to(`profile/${blacklist.senderId}`).emit('removeBlackListSender', blacklist);
            this.io.to(`profile/${blacklist.bannedId}`).emit('removeBlackListBanned', blacklist);
          });
          socket.on('disconnecting', () => {
               socket.rooms.forEach(room => {
                socket.leave(room);
               });
          });
          this.io.on('disconnect', socket => {
            socket.rooms.forEach(room => {
              socket.leave(room);
            });
          });
          });
    }
}

module.exports = SocketService;