declare module 'docusign-esign' {
  export class ApiClient {
    constructor();
    setBasePath(basePath: string): void;
    addDefaultHeader(headerName: string, headerValue: string): void;
    requestJWTUserToken(
      clientId: string,
      userId: string,
      scopes: string | string[],
      privateKey: string | Buffer,
      expiresIn: number
    ): Promise<{
      body: {
        access_token: string;
        expires_in: number;
        token_type: string;
      };
    }>;
  }

  export class EnvelopesApi {
    constructor(apiClient: ApiClient);
    createEnvelope(
      accountId: string,
      options?: { envelopeDefinition?: EnvelopeDefinition }
    ): Promise<EnvelopeSummary>;
    createRecipientView(
      accountId: string,
      envelopeId: string,
      options?: { recipientViewRequest?: RecipientViewRequest }
    ): Promise<ViewUrl>;
    getEnvelope(accountId: string, envelopeId: string): Promise<Envelope>;
  }

  export class EnvelopeDefinition {
    templateId?: string;
    templateRoles?: TemplateRole[];
    status?: string;
    emailSubject?: string;
    emailBlurb?: string;
  }

  export class TemplateRole {
    static constructFromObject(obj: {
      email?: string;
      name?: string;
      roleName?: string;
      clientUserId?: string;
      tabs?: Tabs;
    }): TemplateRole;
    email?: string;
    name?: string;
    roleName?: string;
    clientUserId?: string;
    tabs?: Tabs;
  }

  export class Tabs {
    static constructFromObject(obj: {
      textTabs?: Text[];
      checkboxTabs?: Checkbox[];
      dateSignedTabs?: DateSigned[];
      signHereTabs?: SignHere[];
    }): Tabs;
    textTabs?: Text[];
    checkboxTabs?: Checkbox[];
    dateSignedTabs?: DateSigned[];
    signHereTabs?: SignHere[];
  }

  export class Text {
    static constructFromObject(obj: {
      tabLabel?: string;
      value?: string;
      locked?: string;
      required?: string;
    }): Text;
    tabLabel?: string;
    value?: string;
    locked?: string;
    required?: string;
  }

  export class Checkbox {
    static constructFromObject(obj: {
      tabLabel?: string;
      selected?: string;
    }): Checkbox;
    tabLabel?: string;
    selected?: string;
  }

  export class DateSigned {
    static constructFromObject(obj: {
      tabLabel?: string;
      value?: string;
    }): DateSigned;
    tabLabel?: string;
    value?: string;
  }

  export class SignHere {
    static constructFromObject(obj: {
      tabLabel?: string;
    }): SignHere;
    tabLabel?: string;
  }

  export class RecipientViewRequest {
    returnUrl?: string;
    authenticationMethod?: string;
    email?: string;
    userName?: string;
    clientUserId?: string;
  }

  export interface EnvelopeSummary {
    envelopeId?: string;
    status?: string;
    statusDateTime?: string;
    uri?: string;
  }

  export interface ViewUrl {
    url?: string;
  }

  export interface Envelope {
    envelopeId?: string;
    status?: string;
    statusDateTime?: string;
    sentDateTime?: string;
    completedDateTime?: string;
    emailSubject?: string;
  }
}
