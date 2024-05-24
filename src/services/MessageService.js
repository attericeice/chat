const FileService = require('../services/FileService');
const { Op, fn, col } = require('sequelize');
const { 
    Dialog, 
    Message, 
    RemovedMessages, 
    Attachments, 
    UsersInDialogs, 
    User, 
    ReadMessages, 
    ResendMessages,
    BlackList} = require('../database/models');
const APIError = require('../errors/APIError');


class MessageService {
    static async createMessage(message) {

    const createdMessage = await Message.create({...message.data, status: 'unread'});
       
    if (message.attachments) {
      await Promise.all(message.attachments.map(async file => {
      const [attachSrc, type, blurhash] = await FileService.uploadAttachment(file);
      await Attachments.create({attachSrc, type, messageId: createdMessage.id, blurhash});
      }));
      }

      if (message.voiceSrc) {
        const [voiceSrc, type] = await FileService.uploadAttachment(message.voiceSrc);
        createdMessage.voiceSrc = voiceSrc;
        await createdMessage.save();
     }

        const newMessage = await Message.findOne({where: {id: createdMessage.id},
        include: [
        {model: Attachments, required: false}, 
        {model: User, attributes: ['id', 'name', 'surname', 'avatar_img', 'link']},
        {model: Message, as: 'answerMessage', include: [
        {model: User, attributes: ['id', 'name', 'surname', 'avatar_img', 'link']},
        {model: Attachments, required: false, attributes: ['id']},
        {model: ReadMessages, required: false, attributes: ['id']},
        {model: ResendMessages, as: 'parent', attributes: ['id'], include: [
        {model: Message, as: 'resends', include: [
        {model: User, attributes: ['id', 'name', 'surname', 'avatar_img', 'link']},
        {model: Attachments, required: false },
        {model: ResendMessages, as: 'parent'}
        ]}
        ]}
        ]}
    ]
    });

      if (message.resendMessages) {
      await ResendMessages.bulkCreate(message.resendMessages.map(resendMessageId => ({messageId: createdMessage.id, resendMessageId})));
      const parent = await ResendMessages.findAll({where: {messageId: newMessage.id}, include: [
      {model: Message, as: 'resends', include: [
        {model: User, attributes: ['id', 'name', 'surname', 'avatar_img', 'link']},
        {model: Attachments, required: false },
        {model: ResendMessages, as: 'parent'}
      ]}
      ]});
      newMessage.dataValues.parent = parent;
    }
      
       return newMessage; 
    } 

    static async getDialogMessages(dialogId, userId, page, diff = 0) {

        const dialogUsers = await UsersInDialogs.findAll({where: {dialogId, userId}});
        
        if (!dialogUsers.length) {
          throw APIError.forbidden('Отказано в доступе');
        }

        const isNegative = diff < 0 ;

        diff = Math.abs(diff);

        const removedMessages = await RemovedMessages.findAll({where: {userId, dialogId}});

        let messagesCount = await Message.count({where: {
            id: {[Op.notIn]: removedMessages.map(message => message.messageId)},
            dialogId
            },
        });

        messagesCount = isNegative ? messagesCount + diff : messagesCount - diff;

        const dialogUser = await UsersInDialogs.findOne({where: {userId: {[Op.not]: userId}, dialogId},
            attributes: [], include: [{model: User, attributes: ['id', 'name', 'surname', 'avatar_img', 'status', 'last_online', 'link'],
            include: [
              {model: BlackList, required: false, as: 'blacklist_sender', where: {bannedId: userId}},
              {model: BlackList, required: false, as: 'blacklist_banned', where: {senderId: userId}}
            ]
          }]
            });
        
        let limit = 20;

        let offset;

        if (messagesCount < limit) offset = 0;
        if (messagesCount < limit * page) {
            limit = limit - ((page * limit) - messagesCount);
            offset = 0;
        }
        else offset = messagesCount - (page * limit);

        const dialogMessages = await Message.findAll({where: {
        id: {[Op.notIn]: removedMessages.map(message => message.messageId)},
        dialogId
        },
        limit,
        offset,
        order: [['id', 'ASC']],
        include: [
        {model: Attachments, required: false},
        {model: User, attributes: ['id', 'name', 'surname', 'avatar_img', 'link']},
        {model: Message, as: 'answerMessage', include: [
          {model: User, attributes: ['id', 'name', 'surname', 'avatar_img', 'link']},
          {model: Attachments, required: false},
          {model: ReadMessages, required: false},
          {model: ResendMessages, attributes: ['id'], as: 'parent'}
        ]},
        {model: ResendMessages, as: 'parent', attributes: ['id'], 
        include: [
        {model: Message, as: 'resends', include: [
          {model: Attachments, required: false},
          {model: User, attributes: ['id', 'name', 'surname', 'avatar_img', 'link']},
        ]}
        ]
      }
        ]
    });

    return {dialogMessages, dialogUser: dialogUser.user, count: messagesCount};  

    }

    static async readMessage(id, userId, dialogId) {
       await ReadMessages.create({messageId: id, userId, dialogId});
       const readMessage = await Message.findOne({where: {id}});
       readMessage.status = 'read';
       await readMessage.save();
       return {id, dialogId};
    } 

    static async removeForSelf(messagesIds, userId, dialogId) {
        const removingForAllIds = [];
        const removingForSelfIds = [];
        await Promise.all(messagesIds.map(async messageId => {
           const messageIsRemoving = await RemovedMessages.count({where: {messageId}});
           if (messageIsRemoving) {
             removingForAllIds.push(messageId);
             removingForSelfIds.push(messageId);
           }
           else {
            removingForSelfIds.push(messageId);
           }
        }));
         await MessageService.removeForAll(removingForAllIds);
         await RemovedMessages.bulkCreate(removingForSelfIds.map(messageId => ({messageId, userId, dialogId})));
         return [removingForAllIds, removingForSelfIds];
    }

    static async removeForAll(messagesIds) {
      await RemovedMessages.destroy({where: {messageId: {[Op.in]: messagesIds}}});
      await ReadMessages.destroy({where: {messageId: {[Op.in]: messagesIds}}});
      await ResendMessages.destroy({where: {resendMessageId: {[Op.in]: messagesIds}}});
      await Message.destroy({where: {id: {[Op.in]: messagesIds}}});
    }

    static async updateMessage(message) {
       const { text, id } = message;
       await Message.update({text}, {where: {id}});
       const updatedMessage = await Message.findOne({where: {id}, include: [
       {model: User, required: true, attributes: ['id', 'name', 'surname', 'avatar_img', 'link']},
       {model: Attachments, required: false},
       {model: ReadMessages},
       {model: ResendMessages, as: 'parent'}
       ]});
       return updatedMessage;
    }

}

module.exports = MessageService;