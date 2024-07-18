/*
  Free and Open Source - GNU LGPLv3
  Copyright © 2023
  Afonso Barracha
*/

export interface IConfirmationEmailData {
  name: string;
  link: string;
}

export type IWelcomeEmailData = Pick<IConfirmationEmailData, 'name'>;
