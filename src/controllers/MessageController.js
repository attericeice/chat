const MessageService = require('../services/MessageService');


class MessageController {
   static async getDialogMessages(req, res, next) {
    try {
      const {dialogId, userId, page, diff} = req.query;
      const dialogMessages = await MessageService.getDialogMessages(dialogId, userId, page, diff);
      res.status(200).json(dialogMessages);
    }
    catch(e){
        next(e);
    }
   }
  static async getAll(req, res, next) {
    try {
      const messages = await MessageService.getAll();
      res.status(200).json(messages);
    }
    catch(e) {
      next(e);
    }
  }
}

module.exports = MessageController;