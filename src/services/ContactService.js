const { ContactRequests, User, UserContacts, BlackList } = require('../database/models');
const { Op } = require('sequelize');


class ContactService {

static async createContact(userId, contactId) {
    const newContact = await UserContacts.bulkCreate([{userId, contactId}, {userId: contactId, contactId: userId}])
    return newContact[0];
}

static async removeContact(userId, contactId) {
   const deletedContact = await UserContacts.destroy({where: {
   userId: {[Op.in]: [userId, contactId]},
   contactId: {[Op.in]: [userId, contactId]}
   }});
   return deletedContact;
}

static async createContactRequest(senderId, userId) {
    const contactRequest = await ContactRequests.create({senderId, userId});
    const contactRequestUsers = await User.findAll({where: {id: {[Op.in]: [senderId, userId]}}});
    return {contactRequest, contactRequestUsers};
}

static async confirmContactRequest({id, userId, senderId}) {
    await ContactRequests.destroy({where: {id}});
    const createdContact = await ContactService.createContact(userId, senderId);
    const contactUsers = await User.findAll({where: {id: {[Op.in]: [userId, senderId]}}});
    return {createdContact, contactUsers};
}

static async cancleContactRequest({id}) {
    const deletedRequest = await ContactRequests.destroy({where: {id}});
    return deletedRequest;
}

static async getSelfRequests(senderId) {
    const selfRequests = await ContactRequests.findAll({where: {senderId}, include: [
    {model: User, as: 'user', attributes: ['id', 'name', 'surname', 'link', 'avatar_img']}
    ]});
    return selfRequests;
}

static async getOtherRequests(userId) {
    const otherRequests = await ContactRequests.findAll({where: {userId}, include: [
    {model: User, as: 'sender', attributes: ['id', 'name', 'surname', 'link', 'avatar_img']}
    ]});
    return otherRequests;
}

static async getContacts(userId) {
    const userContacts = await UserContacts.findAll({where: {userId}, include: [
    {model: User, as: 'contact', attributes: ['id', 'name', 'surname', 'link', 'avatar_img', 'status']}
    ]});
    return userContacts;
}

static async getSearchUsers(currentUserId, search, page) {

    const sendersBlackListUsers = await BlackList.findAll(
    {where: {bannedId: currentUserId},
    attributes: ['senderId']
    });

    const ignoreUserIds = sendersBlackListUsers.map(user => user.senderId).concat(currentUserId);

    const limit = 10;

    const searchUsers = await User.findAndCountAll({
    where: {[Op.or]: [{name: {[Op.like]: `%${search}%`}}, {surname: {[Op.like]: `%${search}%`}}], id: {[Op.notIn]: ignoreUserIds}},
    attributes: ['id', 'name', 'surname', 'link', 'avatar_img'], 
    include: [
    {model: UserContacts, required: false, where: {contactId: currentUserId}},
    {model: ContactRequests, as: 'sentRequest', where: {userId: currentUserId}, required: false},
    {model: ContactRequests, as: 'receiverRequest', where: {senderId: currentUserId}, required: false},
    {model: BlackList, as: 'blacklist_banned', required: false}
    ],
    limit,
    offset: limit * page,
});
    
    return searchUsers;
}

}

module.exports = ContactService;