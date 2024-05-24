const sequelize = require('./db');
const {DataTypes} = require('sequelize');


const User = sequelize.define('users', {
    id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
    name: {type: DataTypes.STRING, allowNull: false},
    surname: {type: DataTypes.STRING, allowNull: false},
    password: {type: DataTypes.STRING, allowNull: false},
    email: {type: DataTypes.STRING, unique: true, allowNull: false},
    avatar_img: {type: DataTypes.STRING, allowNull: true},
    link: {type: DataTypes.STRING, unique: true, allowNull: false},
    banner_img: {type: DataTypes.STRING, allowNull: true},
    status: {type: DataTypes.STRING, allowNull: false},
    last_online: {type: DataTypes.DATE, allowNull: false}
});

const Message = sequelize.define('messages', {
    id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
    text: {type: DataTypes.TEXT, allowNull: true},
    type: {type: DataTypes.STRING, allowNull: false, defaultValue: 'default'},
    voiceSrc: {type: DataTypes.STRING, allowNull: true},
    isAnswer: {type: DataTypes.BOOLEAN, defaultValue: false},
    status: {type: DataTypes.STRING, allowNull: false, defaultValue: 'unread'},
}, {charset: 'utf8mb4', collate: 'utf8mb4_unicode_ci'});

const ReadMessages = sequelize.define('read__messages', {
    id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
});

const Dialog = sequelize.define('dialog', {
    id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
    type: {type: DataTypes.STRING, allowNull: false }
});

const Attachments = sequelize.define('attachments', {
    id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
    attachSrc: {type: DataTypes.STRING, allowNull: false},
    type: {type: DataTypes.STRING, allowNull: false},
    blurhash: {type: DataTypes.STRING, allowNull: true, defaultValue: null},
});

const Token = sequelize.define('tokens', {
    id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
    refresh_token: {type: DataTypes.STRING, allowNull: false}
});

const UsersInDialogs = sequelize.define('users_in_dialogs', {
    id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
    userId: {type: DataTypes.INTEGER, allowNull: false},
    dialogId: {type: DataTypes.INTEGER, allowNull: false}
}, {timestamps: false});

const ResendMessages = sequelize.define('resend_messages', {
    id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
    messageId: {type: DataTypes.INTEGER, allowNull: false},
    resendMessageId: {type: DataTypes.INTEGER, allowNull: false},
});

const RemovedMessages = sequelize.define('removed_messages', {
    id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
});

const RemovedDialogs = sequelize.define('removed_dialogs', {
    id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
});

const Notifications = sequelize.define('notifications', {
    id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
    userId: {type: DataTypes.INTEGER, allowNull: false, references: {
        model: User,
        key: 'id'
    }},
    text: {type: DataTypes.STRING, allowNull: false},
    img: {type: DataTypes.STRING, allowNull: false},
    link: {type: DataTypes.STRING, allowNull: true},
    linkText: {type: DataTypes.STRING, allowNull: true} 
});

const ContactRequests = sequelize.define('contact_requests', {
    id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
});

const UserSettings = sequelize.define('user_settings', {
    id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
    messages_without_contact: {type: DataTypes.BOOLEAN, defaultValue: true},
    show_last_online: {type: DataTypes.BOOLEAN, defaultValue: true},
    show_email: {type: DataTypes.STRING, defaultValue: 'everyone'},
    show_number: {type: DataTypes.STRING, defaultValue: 'everyone'}
});

const UserInformation = sequelize.define('user_information', {
    id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
    phone: {type: DataTypes.STRING},
    birthday: {type: DataTypes.DATE}
});

const UserMedia = sequelize.define('user_media', {
    id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
    type: {type: DataTypes.STRING, allowNull: false},
    src: {type: DataTypes.STRING, allowNull: false},
    isGenerated: {type: DataTypes.BOOLEAN, allowNull: false},
    isAvatar: {type: DataTypes.BOOLEAN, allowNull: false},
    blurhash: {type: DataTypes.STRING, allowNull: true, defaultValue: null}
});

const UserContacts = sequelize.define('user_contacts', {
    id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
    userId: {type: DataTypes.INTEGER, references: {
        model: User,
        key: 'id'
    }},
    contactId: {type: DataTypes.INTEGER, references: {
        model: User,
        key: 'id'
    }}
});

const BlackList = sequelize.define('black_list', {
  id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
});

User.hasMany(Message);
Message.belongsTo(User);
User.hasMany(UsersInDialogs);
UsersInDialogs.belongsTo(User);
Dialog.hasMany(UsersInDialogs);
UsersInDialogs.belongsTo(Dialog);
User.hasMany(Token);
Token.belongsTo(User);
Dialog.hasMany(Message);
Message.belongsTo(Dialog);
Message.hasMany(Attachments);
Attachments.belongsTo(Message);
Message.hasMany(ResendMessages, {as: 'parent', foreignKey: 'messageId'});
ResendMessages.belongsTo(Message, {as: 'resends', foreignKey: 'resendMessageId'});
Message.hasMany(RemovedMessages);
RemovedMessages.belongsTo(Message);
User.hasMany(RemovedMessages);
RemovedMessages.belongsTo(User);
User.hasMany(RemovedDialogs);
RemovedDialogs.belongsTo(User);
Dialog.hasMany(RemovedDialogs);
RemovedDialogs.belongsTo(Dialog);
User.hasMany(ReadMessages);
ReadMessages.belongsTo(User);
Message.hasMany(ReadMessages);
ReadMessages.belongsTo(Message);
Dialog.hasMany(ReadMessages);
ReadMessages.belongsTo(Dialog);
Dialog.hasMany(RemovedMessages);
RemovedMessages.belongsTo(Dialog);
User.hasMany(Notifications, {foreignKey: 'userId'});
Notifications.belongsTo(User);
User.hasMany(ContactRequests, {as: 'sentRequest', foreignKey: 'senderId'});
User.hasMany(ContactRequests, {as: 'receiverRequest', foreignKey: 'userId'})
ContactRequests.belongsTo(User, {as: 'sender'});
ContactRequests.belongsTo(User, {as: 'user'});
User.hasOne(UserInformation);
UserInformation.belongsTo(User);
User.hasOne(UserSettings);
UserSettings.belongsTo(User);
User.hasMany(UserMedia);
UserMedia.belongsTo(User);
User.hasMany(UserContacts);
UserContacts.belongsTo(User, {as: 'user'});
UserContacts.belongsTo(User, {as: 'contact'});
User.hasMany(BlackList, {as: 'blacklist_sender', foreignKey: 'senderId'});
User.hasMany(BlackList, {as: 'blacklist_banned', foreignKey: 'bannedId'});
BlackList.belongsTo(User, {as: 'banned'});
BlackList.belongsTo(User, {as: 'sender'});
Message.belongsTo(Message, {as: 'answerMessage', foreignKey: 'answerMessageId'})



module.exports = {
    User,
    Message,
    ResendMessages,
    Attachments,
    Dialog,
    UsersInDialogs,
    Token,
    RemovedDialogs,
    RemovedMessages,
    ReadMessages,
    UserInformation,
    UserMedia,
    UserSettings,
    ContactRequests,
    UserContacts,
    Notifications,
    BlackList,
}