declare module 'docusign-esign' {
  export = docusign;
  
  namespace docusign {
    class ApiClient {
      setBasePath(basePath: string): void;
      addDefaultHeader(name: string, value: string): void;
      requestJWTUserToken(
        integrationKey: string,
        userId: string,
        scopes: string[],
        privateKey: Buffer,
        expiresIn: number
      ): Promise<{ body: { access_token: string } }>;
    }

    class AccountsApi {
      constructor(apiClient: ApiClient);
      listAccounts(): Promise<{ accounts: Array<{ accountId: string }> }>;
    }

    class EnvelopesApi {
      constructor(apiClient: ApiClient);
      createEnvelope(accountId: string, options: { envelopeDefinition: EnvelopeDefinition }): Promise<{ envelopeId: string }>;
      getEnvelope(accountId: string, envelopeId: string): Promise<{
        envelopeId: string;
        status: string;
        statusChangedDateTime: string;
        completedDateTime?: string;
        recipients: Record<string, unknown>;
      }>;
    }

    interface Document {
      documentBase64: string;
      name: string;
      fileExtension: string;
      documentId: string;
    }

    interface Signer {
      email: string;
      name: string;
      recipientId: string;
      routingOrder: string;
      tabs?: {
        signHereTabs?: SignHere[];
        dateSignedTabs?: DateSigned[];
      };
    }

    interface SignHere {
      documentId: string;
      pageNumber: string;
      recipientId: string;
      tabLabel: string;
      xPosition: string;
      yPosition: string;
    }

    interface DateSigned {
      documentId: string;
      pageNumber: string;
      recipientId: string;
      tabLabel: string;
      xPosition: string;
      yPosition: string;
    }

    interface EnvelopeDefinition {
      emailSubject: string;
      documents: Document[];
      recipients: {
        signers: Signer[];
      };
      status: string;
    }
  }
}
