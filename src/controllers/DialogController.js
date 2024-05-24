const DialogService = require('../services/DialogService');

class DialogController {
    static async createPrivateDialog(req, res, next) {
        try {
            console.log(req.body)
           const {userId, interluctorId} = req.body;
           const newDialogData = await DialogService.createPrivateDialog(userId, interluctorId);
           res.status(200).json(newDialogData);
        }
        catch (e) {
            next(e);
        }
    }

    static async removeDialog(req, res, next) {
        try {
          const {userId, dialogId} = req.body;
          const dialogIsDeleted = await DialogService.removeDialog(userId, dialogId);
          res.status(200).json(dialogIsDeleted);
        }
        catch(e) {
            next(e);
        }
    }
    static async getUserDialogs(req, res, next) {
        try {
           const options = req.query;
           const { id } = req.params;
           const dialogs = await DialogService.getUserDialogs(id, options);
           res.status(200).json(dialogs);
        }
        catch(e) {
            next(e);
        }
    }
}

module.exports = DialogController;