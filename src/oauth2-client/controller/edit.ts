import Controller from '@curveball/controller';
import { Context } from '@curveball/core';
import * as privilegeService from '../../privilege/service';
import * as hal from '../formats/hal';
import { Forbidden, NotFound, UnprocessableEntity } from '@curveball/http-errors';
import * as principalService from '../../principal/service';
import { findByClientId, edit } from '../service';
import * as oauth2Service from '../../oauth2/service';
import { GrantType } from '../types';

class EditClientController extends Controller {

  async get(ctx: Context) {

    const app = await principalService.findByExternalId(ctx.params.id, 'app');
    if (!await privilegeService.hasPrivilege(ctx, 'admin')) {
      throw new Forbidden('Only users with the "admin" privilege can add new OAuth2 clients');
    }

    const client = await findByClientId(ctx.params.clientId);
    if (client.app.id !== app.id) {
      throw new NotFound('OAuth2 client not found');
    }

    ctx.response.body = hal.editForm(client, await oauth2Service.getRedirectUris(client));

  }

  async post(ctx: Context<any>) {

    const app = await principalService.findByExternalId(ctx.params.id, 'app');
    if (!await privilegeService.hasPrivilege(ctx, 'admin')) {
      throw new Forbidden('Only users with the "admin" privilege can inspect OAuth2 clients that are not your own');
    }
    const client = await findByClientId(ctx.params.clientId);
    if (client.app.id !== app.id) {
      throw new NotFound('OAuth2 client not found');
    }

    const allowedGrantTypes: GrantType[] = [];

    if (ctx.request.body.allowClientCredentials) {
      allowedGrantTypes.push('client_credentials');
    }
    if (ctx.request.body.allowAuthorizationCode) {
      allowedGrantTypes.push('authorization_code');
    }
    if (ctx.request.body.allowImplicit) {
      allowedGrantTypes.push('implicit');
    }
    if (ctx.request.body.allowRefreshToken) {
      allowedGrantTypes.push('refresh_token');
    }
    if (ctx.request.body.allowPassword) {
      allowedGrantTypes.push('password');
    }

    const redirectUris = ctx.request.body.redirectUris.trim().split(/\r\n|\n/).filter((line:string) => !!line);

    if (!allowedGrantTypes) {
      throw new UnprocessableEntity('You must specify the allowedGrantTypes property');
    }

    client.allowedGrantTypes = allowedGrantTypes;
    client.requirePkce = ctx.request.body.requirePkce ?? false,

    await edit(client, redirectUris);
    ctx.redirect(303, client.href);

  }

}

export default new EditClientController();
