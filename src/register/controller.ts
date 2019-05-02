import Controller from '@curveball/controller';
import { Context } from '@curveball/core';
import { Forbidden, NotFound } from '@curveball/http-errors';
import { getSetting } from '../server-settings';
import * as userService from '../user/service';
import { registrationForm } from './formats/html';

class RegistrationController extends Controller {

  async get(ctx: Context) {

    ctx.response.type = 'text/html';
    ctx.response.body = registrationForm(ctx.query.msg);

  }

  async post(ctx: Context) {

    try {
      await userService.findByIdentity('mailto:' + ctx.request.body.emailaddress);
      throw new Error('User already exists');
    } catch (err) {
      if (!(err instanceof NotFound)) {
        throw err;
      }
    }

    const user = await userService.save({
      identity: 'mailto:' + ctx.request.body.emailaddress,
      nickname: ctx.request.body.nickname,
      created: new Date(),
      type: 1
    });

    await userService.createPassword(user, ctx.request.body.password);


    ctx.status = 308;
    ctx.response.headers.set('Location', '/login?msg=Registration+successful.+Please log in');

  }

  async dispatch(ctx: Context) {

    if (!getSetting('registration.enabled')) {
      throw new Forbidden('This feature is disabled');
    }
    return super.dispatch(ctx);

  }


}

export default new RegistrationController();
