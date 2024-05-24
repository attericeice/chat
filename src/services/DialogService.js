const { 
    Dialog, 
    UsersInDialogs, 
    RemovedMessages, 
    Message, 
    User, 
    Attachments, 
    ResendMessages, 
    BlackList
} = require('../database/models');
const APIError = require('../errors/APIError');
const { Op, fn, col } = require('sequelize');

class DialogService {
   static async createPrivateDialog(userId, interluctorId) {
    const newDialog = await Dialog.create({type: 'private'});
    await UsersInDialogs.bulkCreate([
        {userId, dialogId: newDialog.id},
        {userId: interluctorId, dialogId: newDialog.id},
    ]);
    return newDialog;
   }
   static async removeDialog(userId, dialogId) {
    

   }

   static async getUserDialogs(userId, options) {

    const UsersInDialog = options.search ?
    {model: UsersInDialogs, required: true, attributes: ['id'], 
    include: [{
        model: User,
        required: true, 
        where: {id: {[Op.notIn]: [userId]}, name: {[Op.like]: `%${options.search}%`}}, 
        attributes: ['name', 'surname', 'avatar_img'],
        include: [
        {model: BlackList, required: false, as: 'blacklist_sender', where: {bannedId: userId}},
        {model: BlackList, required: false, as: 'blacklist_banned', where: {senderId: userId}}
        ]
    }]}
    : {model: UsersInDialogs, required: true, attributes: ['id'], 
    include: [{
        model: User, 
        where: {id: {[Op.notIn]: [userId]}}, 
        attributes: ['name', 'surname', 'avatar_img', 'status', 'last_online'],
        include: [
        {model: BlackList, required: false, as: 'blacklist_sender', where: {bannedId: userId}},
        {model: BlackList, required: false, as: 'blacklist_banned', where: {senderId: userId}}
        ]
    }]}
    
    const dialogIds = await UsersInDialogs.findAll({where: {userId}, attributes: ['dialogId']});
    let removedMessagesInDialog = await RemovedMessages.findAll({where: {userId}, attributes: ['messageId']});
    removedMessagesInDialog = removedMessagesInDialog.map(item => item = item.messageId);

    let userDialogs = await Dialog.findAll({where: {id: {[Op.in] : dialogIds.map(item => item = item.dialogId)}},
    include: [
    {model: Message, required: true, order: [['createdAt', 'DESC']], limit: 1, where: {id: {[Op.notIn]: removedMessagesInDialog}},
    include: [{model: User, required: true, attributes: ['name']},
    {model: Attachments, required: false, attributes: ['id']},
    {model: ResendMessages, as: 'parent'}
],  
},
    UsersInDialog
],
});

   userDialogs = userDialogs.filter(item => item.messages && item.messages.length);

   const UnreadMessagesInDialogs = await Dialog.findAll({
    where: {
        id: {[Op.in]: userDialogs.map(item => item.dataValues.id)}
    },
    include: [{model: Message, required: false, where: {status: 'unread', userId: {[Op.not]: userId}}}]

    
});

   return userDialogs.map((item, i) => {
     item.dataValues.unread = UnreadMessagesInDialogs[i].dataValues.messages.length;
     return item;
   }).sort((a, b) => {
    const dateOne = new Date(a.messages[0].createdAt).getTime();
    const dateTwo = new Date(b.messages[0].createdAt).getTime();
    return dateTwo - dateOne;
   });
   
   }
   
   static async getUpdatedDialogState(dialogId, userId) {
      const updatedDialog = await Dialog.findOne({where: {id: dialogId}, include: [
      {model: UsersInDialogs, attributes: ['id'], include: [
      {model: User, where: {id: {[Op.not]: userId}}, attributes: ['name', 'surname', 'avatar_img', 'status', 'last_online'],
      include: [
      {model: BlackList, required: false, as: 'blacklist_sender', where: {bannedId: userId}},
      {model: BlackList, required: false, as: 'blacklist_banned', where: {senderId: userId}}
      ]
    },
      ]},
      {model: Message, limit: 1, order: [['createdAt', 'DESC']], include: [
      {model: User, attributes: ['name']},
      {model: ResendMessages, as: 'parent'}
      ]}
      ]});
      const unread = await Message.count({where: {dialogId, userId: {[Op.not]: userId}, status: 'unread'}});
      updatedDialog.dataValues.unread = unread;
      return updatedDialog;
   }

   static async getDialogUsers(dialogId) {
        const dialogUsers = await UsersInDialogs.findAll({where: {dialogId}, attributes: [],
         include: [{model: User}]});
        return dialogUsers.map(item => item.user);
   }
}

module.exports = DialogService;