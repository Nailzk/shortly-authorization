/*
  Free and Open Source - GNU LGPLv3
  Copyright © 2023
  Afonso Barracha
*/

import { TemplateDelegate } from 'handlebars';
import { IConfirmationEmailData, IWelcomeEmailData } from './template-data.interface';

export interface IEmailParts {
  confirmation: TemplateDelegate<IConfirmationEmailData>;
  resetPassword: TemplateDelegate<IConfirmationEmailData>;
  welcome: TemplateDelegate<IWelcomeEmailData>
}
