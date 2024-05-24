class APIError extends Error{
    constructor(status, message, errors, fieldError = "none"){
        super();
        this.message = message;
        this.status = status;
        this.errors = errors;
        this.fieldError = fieldError;
    }

    static badRequest(message, errors = [], fieldError){
       return new APIError(400, message, errors, fieldError);
    }

    static forbidden(){
        return new APIError(403, 'Отказано в доступе');
    }

    static UnauthorizedError(){
        return new APIError(401, 'Пользователь не авторизован');
    }

    static internalError(){
        return new APIError(500, 'Внутренняя ошибка сервера');
    }
}

module.exports = APIError;