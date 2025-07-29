/**
 * Translations for the loan application process
 * Languages: English (en), Spanish (es)
 */

export type Language = 'en' | 'es';

export interface Translations {
  // Language Selection Step
  languageSelection: {
    title: string;
    subtitle: string;
    selectLanguage: string;
    continue: string;
    english: string;
    spanish: string;
  };
  
  // Welcome Step
  welcome: {
    title: string;
    subtitle: string;
    getStarted: string;
  };
  
  // Phone Verification Step
  phoneVerification: {
    title: string;
    subtitle: string;
    phoneLabel: string;
    phonePlaceholder: string;
    getOtp: string;
    sending: string;
    otpTitle: string;
    otpSubtitle: string;
    otpSent: string;
    otpNotReceived: string;
    otpResend: string;
    resending: string;
    verify: string;
    verifying: string;
    changeNumber: string;
    verified: string;
    verifiedMessage: string;
    back: string;
    continue: string;
    error: {
      enterPhone: string;
      enterCompleteCode: string;
      invalidCode: string;
      sendFailed: string;
      verifyFailed: string;
    };
  };
  
  // Personal Details Step
  personalDetails: {
    title: string;
    subtitle: string;
    fullName: string;
    loanAmount: string;
    email: string;
    verifiedPhone: string;
    loanDetails: string;
    dealer: string;
    vehicleYear: string;
    vehicleMake: string;
    vehicleModel: string;
    vehicleVin: string;
    dateOfBirth: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    back: string;
    next: string;
    validation: {
      dobRequired: string;
      ageRequirement: string;
      addressRequired: string;
      addressMinLength: string;
      cityRequired: string;
      cityMinLength: string;
      stateRequired: string;
      stateMinLength: string;
      zipRequired: string;
      zipInvalid: string;
    };
  };
  
  // Employment Details Step
  employment: {
    title: string;
    subtitle: string;
    employmentStatus: string;
    annualIncome: string;
    currentEmployer: string;
    businessName: string;
    timeWithEmployment: string;
    back: string;
    next: string;
    employmentOptions: {
      employed: string;
      selfEmployed: string;
      unemployed: string;
      retired: string;
      student: string;
    };
    additionalInfo: {
      title: string;
      unemployed: string;
      retired: string;
      student: string;
    };
    validation: {
      statusRequired: string;
      incomeRequired: string;
      incomeInvalid: string;
      incomeMinimum: string;
      incomeMaximum: string;
      employerRequired: string;
      employerMinLength: string;
      timeRequired: string;
      timeMinLength: string;
    };
  };
  
  // References Step
  references: {
    title: string;
    subtitle: string;
    reference: string;
    name: string;
    phone: string;
    email: string;
    back: string;
    next: string;
  };
  
  // Identity Verification Step
  identityVerification: {
    title: string;
    subtitle: string;
    secureTitle: string;
    secureList: string[];
    readyTitle: string;
    readySubtitle: string;
    startVerification: string;
    skipVerification: string;
    startingTitle: string;
    startingSubtitle: string;
    processingTitle: string;
    processingSubtitle: string;
    verifiedTitle: string;
    verifiedSubtitle: string;
    failedTitle: string;
    failedSubtitle: string;
    tryAgain: string;
    back: string;
    next: string;
  };
  
  // Consent Step
  consent: {
    title: string;
    subtitle: string;
    importantNotice: string;
    noticeText: string;
    communicationTitle: string;
    primaryConsent: string;
    primaryConsentDetail: string;
    selectMethods: string;
    textMessages: string;
    textMessagesDetail: string;
    phoneCalls: string;
    phoneCallsDetail: string;
    back: string;
    next: string;
  };
  
  // Review Step
  review: {
    title: string;
    subtitle: string;
    basicInfo: string;
    fullName: string;
    email: string;
    verifiedPhone: string;
    dateOfBirth: string;
    address: string;
    streetAddress: string;
    city: string;
    state: string;
    zipCode: string;
    loanInfo: string;
    loanAmount: string;
    dealer: string;
    vehicleInfo: string;
    year: string;
    make: string;
    model: string;
    vin: string;
    employmentInfo: string;
    employmentStatus: string;
    annualIncome: string;
    currentEmployer: string;
    timeWithEmployment: string;
    references: string;
    reference: string;
    name: string;
    phone: string;
    noReferences: string;
    verificationConsent: string;
    identityVerification: string;
    verified: string;
    pending: string;
    communicationConsent: string;
    textConsent: string;
    phoneConsent: string;
    yes: string;
    no: string;
    back: string;
    submitApplication: string;
    submitting: string;
  };
  
  // Success Step
  success: {
    title: string;
    subtitle: string;
    whatNext: string;
    step1: string;
    step2: string;
    step3: string;
    importantInfo: string;
    info: string[];
    questions: string;
    questionsText: string;
  };
  
  // Loading and Error Messages
  loading: {
    application: string;
  };
  
  error: {
    title: string;
    occurred: string;
  };
  
  // Common Elements
  common: {
    loading: string;
    back: string;
    next: string;
    continue: string;
    submit: string;
    cancel: string;
    yes: string;
    no: string;
    required: string;
    optional: string;
    notProvided: string;
  };

  // DocuSign Document Translations
  docusign: {
    document: {
      title: string;
      companyTagline: string;
      loanInformation: string;
      borrowerInformation: string;
      weeklyPaymentSchedule: string;
      totalPayments: string;
      personalFinancingAgreement: string;
      emailSubject: string;
    };
    legal: {
      contractParties: string;
      borrowerRepresentations: string;
      paymentTerms: string;
      defaultConditions: string;
      additionalAgreements: string;
      signatureSection: string;
      fees: string;
      juryTrialWaiver: string;
      arbitrationProvision: string;
      acknowledgmentText: string;
      contractUnderstanding: string;
    };
    content: {
      legalAgreementTitle: string;
      legalAgreementSubtitle: string;
      contractIntroduction: string;
      borrowerDefinition: string;
      lenderDefinition: string;
      paymentBeneficiaryDefinition: string;
      representationIntro: string;
      paymentTermsIntro: string;
      defaultConditionsIntro: string;
      additionalAgreementsIntro: string;
      feesTitle: string;
      processingFeeTitle: string;
      processingFeeDescription: string;
      processingFeeAmount: string;
      processingFeeAvoidance: string;
      lateFeeTitle: string;
      lateFeeDescription: string;
      lateFeeAmount: string;
      defermentFeeTitle: string;
      defermentFeeDescription: string;
      defermentFeeRestrictions: string;
      defermentFeeAmount: string;
      returnedPaymentFeeTitle: string;
      returnedPaymentFeeDescription: string;
      returnedPaymentFeeAmount: string;
      feesImportantNote: string;
      feesAutoDebit: string;
      accountVerificationFee: string;
      legalAgeText: string;
      vehicleConditionText: string;
      separateContractText: string;
      noOralPromisesText: string;
      paymentTermsItem1: string;
      paymentTermsItem2: string;
      paymentTermsItem3: string;
      paymentTermsItem4: string;
      paymentTermsItem5: string;
      paymentTermsItem6: string;
      paymentTermsItem7: string;
      paymentTermsItem8: string;
      paymentTermsItem9: string;
      defaultItem1: string;
      defaultItem2: string;
      defaultItem3: string;
      defaultItem4: string;
      defaultItem5: string;
      defaultItem6: string;
      gpsTrackingText: string;
      privacyWaiverText: string;
      electronicCommunicationsText: string;
    };
    headers: {
      applicationDate: string;
      requestedLoanAmount: string;
      dealership: string;
      vehicleYear: string;
      make: string;
      model: string;
      vin: string;
      issueDate: string;
      firstPaymentDate: string;
      lenderInformation: string;
      borrowerInformation: string;
      references: string;
      financialSummary: string;
      acknowledgmentSignatures: string;
      professionalLendingServices: string;
      trustedFinancialPartner: string;
    };
    labels: {
      address: string;
      employment: string;
      status: string;
      annualSalary: string;
      employer: string;
      timeWithEmployer: string;
      reference1: string;
      reference2: string;
      phone: string;
      printName: string;
      date: string;
      borrowerSignature: string;
      dealerRepresentative: string;
      financeCharge: string;
      totalOfPayments: string;
      dateOfBirth: string;
    };
    fields: {
      borrowerName: string;
      interestRate: string;
      loanType: string;
      principalAmount: string;
      weeklyPayment: string;
      termWeeks: string;
      legalAge: string;
      vehicleCondition: string;
      separateContract: string;
      noOralPromises: string;
      gpsTracking: string;
      privacyWaiver: string;
      electronicCommunications: string;
      initialToAcknowledge: string;
      paymentNumber: string;
      dueDate: string;
      payment: string;
      principal: string;
      interest: string;
      balance: string;
    };
  };
}

export const translations: Record<Language, Translations> = {
  en: {
    languageSelection: {
      title: "Select Your Language",
      subtitle: "Please choose your preferred language for the loan application process.",
      selectLanguage: "Select Language",
      continue: "Continue",
      english: "English",
      spanish: "Español"
    },
    
    welcome: {
      title: "Welcome, {name}!",
      subtitle: "Thank you for choosing iPayUS. You're just a few steps away from completing your loan application. Let's get started.",
      getStarted: "Get Started"
    },
    
    phoneVerification: {
      title: "Enter Your Phone Number",
      subtitle: "We'll send you a one-time password to verify your phone number",
      phoneLabel: "Mobile Number",
      phonePlaceholder: "+1 (555) 123-4567",
      getOtp: "GET OTP",
      sending: "Sending...",
      otpTitle: "OTP Verification",
      otpSubtitle: "Enter the OTP sent to",
      otpSent: "Verification code sent! Please check your messages.",
      otpNotReceived: "Don't receive the OTP?",
      otpResend: "RESEND OTP",
      resending: "SENDING...",
      verify: "VERIFY & PROCEED",
      verifying: "Verifying...",
      changeNumber: "Change Number",
      verified: "Phone Verified!",
      verifiedMessage: "Your phone number has been successfully verified.",
      back: "Back",
      continue: "Continue",
      error: {
        enterPhone: "Please enter your phone number",
        enterCompleteCode: "Please enter the complete 6-digit verification code",
        invalidCode: "Invalid verification code. Please try again.",
        sendFailed: "Failed to send verification code",
        verifyFailed: "Failed to verify code"
      }
    },
    
    personalDetails: {
      title: "Personal Information",
      subtitle: "Please provide your personal details. Identity verification (including SSN) will be handled securely through Stripe in a later step.",
      fullName: "Full Name",
      loanAmount: "Loan Amount",
      email: "Email",
      verifiedPhone: "Verified Phone Number",
      loanDetails: "Loan Details",
      dealer: "Dealer",
      vehicleYear: "Vehicle Year",
      vehicleMake: "Vehicle Make",
      vehicleModel: "Vehicle Model",
      vehicleVin: "Vehicle VIN",
      dateOfBirth: "Date of Birth",
      address: "Address",
      city: "City",
      state: "State",
      zipCode: "ZIP Code",
      back: "Back",
      next: "Next",
      validation: {
        dobRequired: "Date of birth is required",
        ageRequirement: "You must be between 18 and 100 years old",
        addressRequired: "Address is required",
        addressMinLength: "Please enter a complete address",
        cityRequired: "City is required",
        cityMinLength: "Please enter a valid city name",
        stateRequired: "State is required",
        stateMinLength: "Please enter a valid state",
        zipRequired: "ZIP code is required",
        zipInvalid: "Please enter a valid ZIP code (e.g., 12345 or 12345-6789)"
      }
    },
    
    employment: {
      title: "Employment Details",
      subtitle: "Please provide your employment information.",
      employmentStatus: "Employment Status",
      annualIncome: "Annual Income",
      currentEmployer: "Current Employer Name",
      businessName: "Business/Company Name",
      timeWithEmployment: "Time with Current Employment",
      back: "Back",
      next: "Next",
      employmentOptions: {
        employed: "Employed",
        selfEmployed: "Self Employed",
        unemployed: "Unemployed",
        retired: "Retired",
        student: "Student"
      },
      additionalInfo: {
        title: "Additional Information",
        unemployed: "Please note that unemployment status may affect loan approval. You may be asked to provide additional documentation.",
        retired: "Please be prepared to provide information about your retirement income, pensions, or social security benefits.",
        student: "As a student, you may need to provide information about financial aid, part-time employment, or a co-signer."
      },
      validation: {
        statusRequired: "Employment status is required",
        incomeRequired: "Annual income is required",
        incomeInvalid: "Please enter a valid annual income",
        incomeMinimum: "Annual income must be at least $1,000",
        incomeMaximum: "Please enter a reasonable annual income",
        employerRequired: "Employer name is required",
        employerMinLength: "Please enter a valid employer name",
        timeRequired: "Time with current employment is required",
        timeMinLength: "Please enter a valid duration (e.g., \"2 years\", \"6 months\")"
      }
    },
    
    references: {
      title: "References",
      subtitle: "Please provide three personal references.",
      reference: "Reference",
      name: "Name",
      phone: "Phone",
      email: "Email",
      back: "Back",
      next: "Next"
    },
    
    identityVerification: {
      title: "Identity Verification",
      subtitle: "To protect against fraud and comply with regulations, we need to verify your identity using Stripe Identity.",
      secureTitle: "Secure Identity Verification",
      secureList: [
        "Your personal information is encrypted and secure",
        "We use Stripe's industry-leading identity verification",
        "This process typically takes 2-3 minutes",
        "You'll need a government-issued photo ID"
      ],
      readyTitle: "Ready to Verify",
      readySubtitle: "Click the button below to start the identity verification process.",
      startVerification: "Start Verification",
      skipVerification: "Skip Verification (for testing)",
      startingTitle: "Starting Verification",
      startingSubtitle: "Please complete the identity verification in the Stripe modal...",
      processingTitle: "Processing Verification",
      processingSubtitle: "Your documents are being verified. This usually takes a few moments...",
      verifiedTitle: "Identity Verified!",
      verifiedSubtitle: "Your identity has been successfully verified. You can now proceed to the next step.",
      failedTitle: "Verification Failed",
      failedSubtitle: "We were unable to verify your identity. Please try again or contact support.",
      tryAgain: "Try Again",
      back: "Back",
      next: "Next"
    },
    
    consent: {
      title: "Communication Consent",
      subtitle: "Please review and provide your consent for how we can contact you during your loan period.",
      importantNotice: "Important Notice",
      noticeText: "By proceeding with this loan application, you agree to be contacted regarding loan updates, payment reminders, and account information. You must consent to at least one form of communication and cannot opt out until your loan is paid in full.",
      communicationTitle: "Communication Consent (Required)",
      primaryConsent: "I consent to be contacted by iPayUS regarding my loan",
      primaryConsentDetail: "This includes loan updates, payment notifications, account information, and customer service communications.",
      selectMethods: "Select how we can contact you (choose at least one):",
      textMessages: "Text Messages (SMS)",
      textMessagesDetail: "Receive payment reminders, account alerts, and important updates via text message.",
      phoneCalls: "Phone Calls",
      phoneCallsDetail: "Receive calls for payment reminders, account updates, and customer service.",
      back: "Back",
      next: "Next"
    },
    
    review: {
      title: "Review Your Application",
      subtitle: "Please confirm that the following information is correct before submitting.",
      basicInfo: "Basic Information",
      fullName: "Full Name",
      email: "Email",
      verifiedPhone: "Verified Phone",
      dateOfBirth: "Date of Birth",
      address: "Address",
      streetAddress: "Street Address",
      city: "City",
      state: "State",
      zipCode: "ZIP Code",
      loanInfo: "Loan Information",
      loanAmount: "Loan Amount",
      dealer: "Dealer",
      vehicleInfo: "Vehicle Information",
      year: "Year",
      make: "Make",
      model: "Model",
      vin: "VIN",
      employmentInfo: "Employment Information",
      employmentStatus: "Employment Status",
      annualIncome: "Annual Income",
      currentEmployer: "Current Employer",
      timeWithEmployment: "Time with Employment",
      references: "References",
      reference: "Reference",
      name: "Name",
      phone: "Phone",
      noReferences: "No references provided",
      verificationConsent: "Verification & Consent",
      identityVerification: "Identity Verification",
      verified: "✅ Verified",
      pending: "⏳ Pending verification",
      communicationConsent: "Communication Consent",
      textConsent: "Text Message Consent",
      phoneConsent: "Phone Call Consent",
      yes: "✅ Yes",
      no: "❌ No",
      back: "Back",
      submitApplication: "Submit Application",
      submitting: "Submitting..."
    },
    
    success: {
      title: "Congratulations!",
      subtitle: "Your Application is Under Review",
      whatNext: "What Happens Next?",
      step1: "Our team will review your application and verify all information provided",
      step2: "We'll contact your references and employer to confirm employment details",
      step3: "You'll receive loan terms and next steps within 2-3 business days",
      importantInfo: "Important Information",
      info: [
        "Check your email and phone for updates from our team",
        "Your identity has been verified through Stripe Identity",
        "We'll contact you using your preferred communication method",
        "Keep your phone accessible in case we need additional information"
      ],
      questions: "Questions?",
      questionsText: "If you have any questions about your application, please contact our customer service team."
    },
    
    loading: {
      application: "Loading Application..."
    },
    
    error: {
      title: "An Error Occurred",
      occurred: "An error occurred"
    },
    
    common: {
      loading: "Loading...",
      back: "Back",
      next: "Next",
      continue: "Continue",
      submit: "Submit",
      cancel: "Cancel",
      yes: "Yes",
      no: "No",
      required: "Required",
      optional: "Optional",
      notProvided: "Not provided"
    },

    docusign: {
      document: {
        title: "Vehicle Loan Agreement",
        companyTagline: "PaySolutions LLC - Professional Financing Services",
        loanInformation: "📋 Loan Information",
        borrowerInformation: "👤 Borrower Information",
        weeklyPaymentSchedule: "📊 Weekly Payment Schedule",
        totalPayments: "Total of {termWeeks} Weekly Payments",
        personalFinancingAgreement: "📄 Personal Financing Agreement (\"PFA\") - Exhibit \"A\"",
        emailSubject: "Vehicle Loan Agreement - {loanNumber} - Signature Required"
      },
      legal: {
        contractParties: "⚖️ Contract Parties",
        borrowerRepresentations: "✅ Borrower's Representations",
        paymentTerms: "💳 Payment Terms",
        defaultConditions: "⚠️ Default Conditions",
        additionalAgreements: "📋 Additional Agreements",
        signatureSection: "✍️ Electronic Signature",
        fees: "💰 iPay System Fees (FEES)",
        juryTrialWaiver: "JURY TRIAL WAIVER. LENDER AND BORROWER HEREBY KNOWINGLY, VOLUNTARILY AND INTENTIONALLY WAIVE THE RIGHT EITHER MAY HAVE TO A TRIAL BY JURY.",
        arbitrationProvision: "ARBITRATION PROVISION: Any claim or dispute between you and us shall, at your or our election, be resolved by neutral, binding arbitration and not by a court action. (Initial provided separately)",
        acknowledgmentText: "THIS AGREEMENT IS SUBJECT TO AN ARBITRATION AGREEMENT AND A PRESUIT DEMAND NOTICE REQUIREMENT, AS SET FORTH IN THIS AGREEMENT. BY SIGNING BELOW, I ACKNOWLEDGE THAT I HAVE READ AND UNDERSTOOD THE PROVISIONS IN THIS AGREEMENT AND AGREE TO THE TERMS AND CONDITIONS AS SET FORTH THEREIN.",
        contractUnderstanding: "I HEREBY SWEAR AND AFFIRM THAT I HAVE READ AND UNDERSTAND THE TERMS OF THIS CONTRACT. (Initial required above)"
      },
      content: {
        legalAgreementTitle: "Personal Financing Agreement",
        legalAgreementSubtitle: "Pay Solutions LLC - The Simple, Smart Way to Grow",
        contractIntroduction: "YOU and PAY SOLUTIONS LLC (hereinafter referred to as \"PS\") are entering into this personal financing agreement (hereinafter referred to as \"Agreement\" or \"PFA\" interchangeably) for the purposes of a personal financing contract to partially cover a down payment for a vehicle sold by {purpose} to you as \"Buyer\" or \"Borrower\" (hereinafter interchangeably), and agree as follows:",
        borrowerDefinition: "BORROWER shall mean, an individual (\"Borrower\"), {borrowerName} with mailing address at {address}.",
        lenderDefinition: "LENDER shall mean PAY SOLUTIONS LLC (\"PS\"), a Florida Limited Liability Company at its office at 575 NW 50th St, Miami, FL 33166, its successors, assigns, and any other holder of this PFA.",
        paymentBeneficiaryDefinition: "PAYMENT BENEFICIARY shall mean the dealership or entity from whom the vehicle is being purchased.",
        representationIntro: "You represent and acknowledge that:",
        paymentTermsIntro: "Initial to acknowledge:",
        defaultConditionsIntro: "You will be deemed in default if any of the following occurs:",
        additionalAgreementsIntro: "Initial to acknowledge:",
        feesTitle: "iPay System Fees (FEES)",
        processingFeeTitle: "Manual Processing Fee (Processing Fee)",
        processingFeeDescription: "Fee applied for processing payments manually (in office, by phone, or in cash).",
        processingFeeAmount: "Amount: $5.00",
        processingFeeAvoidance: "Can be avoided if the customer uses automatic payments (AutoPay).",
        lateFeeTitle: "Late Payment Fee (Late Fee)",
        lateFeeDescription: "Fee applied if 5 days have passed since the due date without the customer making the payment.",
        lateFeeAmount: "Amount: $15.00",
        defermentFeeTitle: "Deferment Fee (Deferment Fee)",
        defermentFeeDescription: "Allows extending the current payment due date by 7 days.",
        defermentFeeRestrictions: "Cannot be applied to the first payment. Can only be used two (2) times during the loan term.",
        defermentFeeAmount: "Amount: $10.00",
        returnedPaymentFeeTitle: "Returned Payment Fee (Returned Payment Fee)",
        returnedPaymentFeeDescription: "Fee applied when a payment is rejected or returned by the bank or processing entity (e.g., insufficient funds, denied transaction).",
        returnedPaymentFeeAmount: "Amount: $25.00",
        feesImportantNote: "Important Note:",
        feesAutoDebit: "These charges will be automatically debited from the customer's account or credit/debit card registered in the iPay system.",
        accountVerificationFee: "The first charge when registering the customer is $1. This will allow us to verify that the customer's account and/or card is correct, and the customer accepts this $1 charge for account activation.",
        legalAgeText: "Legal Age. You are of legal age and have legal capacity to enter into this Contract.",
        vehicleConditionText: "Vehicle Condition. I have thoroughly inspected, accepted, and approved the motor vehicle in all respects, and I am satisfied with the condition of the vehicle.",
        separateContractText: "Separate to Retail Contract. You represent and understand that this is not an agreement to purchase the vehicle, but rather, an agreement to cover the down payment portion of said vehicle.",
        noOralPromisesText: "No Oral Promises. You agree that this contract shall be controlling over all oral and verbal discussion and negotiations leading up to this contract.",
        paymentTermsItem1: "For all provisions in this contract, time is of the essence.",
        paymentTermsItem2: "Principal Amount shall mean ${principalAmount} (US Dollars) that will cover a portion of an initial payment.",
        paymentTermsItem3: "For VALUE RECEIVED, the Buyer hereby promises to pay to the order of the Lender, the Principal Amount with interest at the annual rate of ${interestRate}% percent, interest shall be calculated on a 365/365 simple interest basis.",
        paymentTermsItem4: "All payments shall be received on or before the business day specified in Exhibit \"A\". If a payment is not received by the end of the business day applicable, an automatic $10.00 flat administrative late fee shall be assessed.",
        paymentTermsItem5: "All payments shall be received on a Business Day on or before 5:00PM Eastern Time (ET).",
        paymentTermsItem6: "If payment is returned for any reason, a returned payment fee of $35.00 shall be paid by Borrower upon demand.",
        paymentTermsItem7: "Card Payment Surcharge. If a customer makes a payment using a card, a surcharge of 1.8% of the payment amount will be applied.",
        paymentTermsItem8: "Borrower can request up to two deferment payments to extend for seven (7) days the current payment date. A fee of $20.00 shall be charged.",
        paymentTermsItem9: "No Prepayment Penalty. This PFA may be prepaid in whole or in part at any time, without incurring any penalty.",
        defaultItem1: "You fail to perform any obligation under this Contract.",
        defaultItem2: "Buyer fails to timely pay as per schedule, or within five (5) days of due date.",
        defaultItem3: "Any materially false statement(s) is made by Borrower.",
        defaultItem4: "Any bankruptcy proceeding is begun by or against Borrower.",
        defaultItem5: "Cancellation or attempted cancellation of this agreement unilaterally by Borrower.",
        defaultItem6: "Failure to report change of name, address or telephone number with at least thirty (30) days' notice.",
        gpsTrackingText: "GPS/Tracking Device Installation. Your vehicle could potentially feature a GPS/TRACKING DEVICE and by signing this document you acknowledge and give consent to the device's installation.",
        privacyWaiverText: "Waiver of Privacy Rights. You agree that you have no privacy rights in the tracking of your vehicle for collection and/or repossession purposes.",
        electronicCommunicationsText: "Electronic Communications. You give permission to contact you via telephone, SMS text messages, emails, or messaging applications."
      },
      headers: {
        applicationDate: "Application Date:",
        requestedLoanAmount: "Requested Loan Amount:",
        dealership: "Dealership:",
        vehicleYear: "Vehicle Year:",
        make: "Make:",
        model: "Model:",
        vin: "VIN:",
        issueDate: "Issue Date:",
        firstPaymentDate: "First Payment Date:",
        lenderInformation: "🏢 Lender Information",
        borrowerInformation: "👤 Borrower Information",
        references: "📞 References",
        financialSummary: "💰 Financial Summary",
        acknowledgmentSignatures: "ACKNOWLEDGMENT AND SIGNATURES",
        professionalLendingServices: "Professional Lending Services",
        trustedFinancialPartner: "Your trusted financial partner"
      },
      labels: {
        address: "📍 Address:",
        employment: "💼 Employment:",
        status: "Status:",
        annualSalary: "Annual Salary:",
        employer: "Employer:",
        timeWithEmployer: "Time with Employer:",
        reference1: "Reference 1:",
        reference2: "Reference 2:",
        phone: "Phone:",
        printName: "Print Name:",
        date: "Date:",
        borrowerSignature: "Borrower Signature:",
        dealerRepresentative: "Dealer Representative:",
        financeCharge: "Finance Charge:",
        totalOfPayments: "Total of Payments:",
        dateOfBirth: "Date of Birth:"
      },
      fields: {
        borrowerName: "Borrower Name:",
        interestRate: "Interest Rate:",
        loanType: "Loan Type:",
        principalAmount: "Principal Amount:",
        weeklyPayment: "Weekly Payment:",
        termWeeks: "Term (Weeks):",
        legalAge: "Legal Age. You are of legal age and have legal capacity to enter into this Contract.",
        vehicleCondition: "Vehicle Condition. I have thoroughly inspected, accepted, and approved the motor vehicle in all respects, and I am satisfied with the condition of the vehicle.",
        separateContract: "Separate to Retail Contract. You represent and understand that this is not an agreement to purchase the vehicle, but rather, an agreement to cover the down payment portion of said vehicle.",
        noOralPromises: "No Oral Promises. You agree that this contract shall be controlling over all oral and verbal discussion and negotiations leading up to this contract.",
        gpsTracking: "GPS/Tracking Device Installation. Your vehicle could potentially feature a GPS/TRACKING DEVICE and by signing this document you acknowledge and give consent to the device's installation.",
        privacyWaiver: "Waiver of Privacy Rights. You agree that you have no privacy rights in the tracking of your vehicle for collection and/or repossession purposes.",
        electronicCommunications: "Electronic Communications. You give permission to contact you via telephone, SMS text messages, emails, or messaging applications.",
        initialToAcknowledge: "Initial to acknowledge:",
        paymentNumber: "#",
        dueDate: "Due Date",
        payment: "Payment",
        principal: "Principal",
        interest: "Interest",
        balance: "Balance"
      }
    }
  },
  
  es: {
    languageSelection: {
      title: "Seleccione Su Idioma",
      subtitle: "Por favor, elija su idioma preferido para el proceso de solicitud de préstamo.",
      selectLanguage: "Seleccionar Idioma",
      continue: "Continuar",
      english: "English",
      spanish: "Español"
    },
    
    welcome: {
      title: "¡Bienvenido, {name}!",
      subtitle: "Gracias por elegir iPayUS. Está a solo unos pasos de completar su solicitud de préstamo. Comencemos.",
      getStarted: "Comenzar"
    },
    
    phoneVerification: {
      title: "Ingrese Su Número de Teléfono",
      subtitle: "Le enviaremos una contraseña de un solo uso para verificar su número de teléfono",
      phoneLabel: "Número Móvil",
      phonePlaceholder: "+1 (555) 123-4567",
      getOtp: "OBTENER CÓDIGO",
      sending: "Enviando...",
      otpTitle: "Verificación de Código",
      otpSubtitle: "Ingrese el código enviado a",
      otpSent: "¡Código de verificación enviado! Por favor revise sus mensajes.",
      otpNotReceived: "¿No recibió el código?",
      otpResend: "REENVIAR CÓDIGO",
      resending: "ENVIANDO...",
      verify: "VERIFICAR Y CONTINUAR",
      verifying: "Verificando...",
      changeNumber: "Cambiar Número",
      verified: "¡Teléfono Verificado!",
      verifiedMessage: "Su número de teléfono ha sido verificado exitosamente.",
      back: "Atrás",
      continue: "Continuar",
      error: {
        enterPhone: "Por favor ingrese su número de teléfono",
        enterCompleteCode: "Por favor ingrese el código de verificación completo de 6 dígitos",
        invalidCode: "Código de verificación inválido. Por favor intente de nuevo.",
        sendFailed: "Error al enviar código de verificación",
        verifyFailed: "Error al verificar código"
      }
    },
    
    personalDetails: {
      title: "Información Personal",
      subtitle: "Por favor proporcione sus datos personales. La verificación de identidad (incluyendo SSN) se manejará de forma segura a través de Stripe en un paso posterior.",
      fullName: "Nombre Completo",
      loanAmount: "Monto del Préstamo",
      email: "Correo Electrónico",
      verifiedPhone: "Número de Teléfono Verificado",
      loanDetails: "Detalles del Préstamo",
      dealer: "Concesionario",
      vehicleYear: "Año del Vehículo",
      vehicleMake: "Marca del Vehículo",
      vehicleModel: "Modelo del Vehículo",
      vehicleVin: "VIN del Vehículo",
      dateOfBirth: "Fecha de Nacimiento",
      address: "Dirección",
      city: "Ciudad",
      state: "Estado",
      zipCode: "Código Postal",
      back: "Atrás",
      next: "Siguiente",
      validation: {
        dobRequired: "La fecha de nacimiento es requerida",
        ageRequirement: "Debe tener entre 18 y 100 años de edad",
        addressRequired: "La dirección es requerida",
        addressMinLength: "Por favor ingrese una dirección completa",
        cityRequired: "La ciudad es requerida",
        cityMinLength: "Por favor ingrese un nombre de ciudad válido",
        stateRequired: "El estado es requerido",
        stateMinLength: "Por favor ingrese un estado válido",
        zipRequired: "El código postal es requerido",
        zipInvalid: "Por favor ingrese un código postal válido (ej., 12345 o 12345-6789)"
      }
    },
    
    employment: {
      title: "Detalles de Empleo",
      subtitle: "Por favor proporcione su información de empleo.",
      employmentStatus: "Estado de Empleo",
      annualIncome: "Ingreso Anual",
      currentEmployer: "Nombre del Empleador Actual",
      businessName: "Nombre del Negocio/Empresa",
      timeWithEmployment: "Tiempo con el Empleo Actual",
      back: "Atrás",
      next: "Siguiente",
      employmentOptions: {
        employed: "Empleado",
        selfEmployed: "Trabajador Independiente",
        unemployed: "Desempleado",
        retired: "Jubilado",
        student: "Estudiante"
      },
      additionalInfo: {
        title: "Información Adicional",
        unemployed: "Tenga en cuenta que el estado de desempleo puede afectar la aprobación del préstamo. Es posible que se le pida proporcionar documentación adicional.",
        retired: "Por favor esté preparado para proporcionar información sobre sus ingresos de jubilación, pensiones o beneficios del seguro social.",
        student: "Como estudiante, es posible que necesite proporcionar información sobre ayuda financiera, empleo a tiempo parcial o un codeudor."
      },
      validation: {
        statusRequired: "El estado de empleo es requerido",
        incomeRequired: "El ingreso anual es requerido",
        incomeInvalid: "Por favor ingrese un ingreso anual válido",
        incomeMinimum: "El ingreso anual debe ser de al menos $1,000",
        incomeMaximum: "Por favor ingrese un ingreso anual razonable",
        employerRequired: "El nombre del empleador es requerido",
        employerMinLength: "Por favor ingrese un nombre de empleador válido",
        timeRequired: "El tiempo con el empleo actual es requerido",
        timeMinLength: "Por favor ingrese una duración válida (ej., \"2 años\", \"6 meses\")"
      }
    },
    
    references: {
      title: "Referencias",
      subtitle: "Por favor proporcione tres referencias personales.",
      reference: "Referencia",
      name: "Nombre",
      phone: "Teléfono",
      email: "Correo Electrónico",
      back: "Atrás",
      next: "Siguiente"
    },
    
    identityVerification: {
      title: "Verificación de Identidad",
      subtitle: "Para proteger contra el fraude y cumplir con las regulaciones, necesitamos verificar su identidad usando Stripe Identity.",
      secureTitle: "Verificación de Identidad Segura",
      secureList: [
        "Su información personal está encriptada y segura",
        "Utilizamos la verificación de identidad líder en la industria de Stripe",
        "Este proceso típicamente toma 2-3 minutos",
        "Necesitará una identificación con foto emitida por el gobierno"
      ],
      readyTitle: "Listo para Verificar",
      readySubtitle: "Haga clic en el botón de abajo para comenzar el proceso de verificación de identidad.",
      startVerification: "Iniciar Verificación",
      skipVerification: "Omitir Verificación (para pruebas)",
      startingTitle: "Iniciando Verificación",
      startingSubtitle: "Por favor complete la verificación de identidad en el modal de Stripe...",
      processingTitle: "Procesando Verificación",
      processingSubtitle: "Sus documentos están siendo verificados. Esto usualmente toma unos momentos...",
      verifiedTitle: "¡Identidad Verificada!",
      verifiedSubtitle: "Su identidad ha sido verificada exitosamente. Ahora puede proceder al siguiente paso.",
      failedTitle: "Verificación Fallida",
      failedSubtitle: "No pudimos verificar su identidad. Por favor intente de nuevo o contacte soporte.",
      tryAgain: "Intentar de Nuevo",
      back: "Atrás",
      next: "Siguiente"
    },
    
    consent: {
      title: "Consentimiento de Comunicación",
      subtitle: "Por favor revise y proporcione su consentimiento sobre cómo podemos contactarlo durante el período de su préstamo.",
      importantNotice: "Aviso Importante",
      noticeText: "Al proceder con esta solicitud de préstamo, usted acepta ser contactado respecto a actualizaciones del préstamo, recordatorios de pago e información de la cuenta. Debe dar consentimiento a al menos una forma de comunicación y no puede optar por no participar hasta que su préstamo esté completamente pagado.",
      communicationTitle: "Consentimiento de Comunicación (Requerido)",
      primaryConsent: "Consiento ser contactado por iPayUS respecto a mi préstamo",
      primaryConsentDetail: "Esto incluye actualizaciones del préstamo, notificaciones de pago, información de la cuenta y comunicaciones de servicio al cliente.",
      selectMethods: "Seleccione cómo podemos contactarlo (elija al menos uno):",
      textMessages: "Mensajes de Texto (SMS)",
      textMessagesDetail: "Recibir recordatorios de pago, alertas de cuenta y actualizaciones importantes vía mensaje de texto.",
      phoneCalls: "Llamadas Telefónicas",
      phoneCallsDetail: "Recibir llamadas para recordatorios de pago, actualizaciones de cuenta y servicio al cliente.",
      back: "Atrás",
      next: "Siguiente"
    },
    
    review: {
      title: "Revise Su Solicitud",
      subtitle: "Por favor confirme que la siguiente información es correcta antes de enviar.",
      basicInfo: "Información Básica",
      fullName: "Nombre Completo",
      email: "Correo Electrónico",
      verifiedPhone: "Teléfono Verificado",
      dateOfBirth: "Fecha de Nacimiento",
      address: "Dirección",
      streetAddress: "Dirección de la Calle",
      city: "Ciudad",
      state: "Estado",
      zipCode: "Código Postal",
      loanInfo: "Información del Préstamo",
      loanAmount: "Monto del Préstamo",
      dealer: "Concesionario",
      vehicleInfo: "Información del Vehículo",
      year: "Año",
      make: "Marca",
      model: "Modelo",
      vin: "VIN",
      employmentInfo: "Información de Empleo",
      employmentStatus: "Estado de Empleo",
      annualIncome: "Ingreso Anual",
      currentEmployer: "Empleador Actual",
      timeWithEmployment: "Tiempo con el Empleo",
      references: "Referencias",
      reference: "Referencia",
      name: "Nombre",
      phone: "Teléfono",
      noReferences: "No se proporcionaron referencias",
      verificationConsent: "Verificación y Consentimiento",
      identityVerification: "Verificación de Identidad",
      verified: "✅ Verificado",
      pending: "⏳ Verificación pendiente",
      communicationConsent: "Consentimiento de Comunicación",
      textConsent: "Consentimiento de Mensajes de Texto",
      phoneConsent: "Consentimiento de Llamadas Telefónicas",
      yes: "✅ Sí",
      no: "❌ No",
      back: "Atrás",
      submitApplication: "Enviar Solicitud",
      submitting: "Enviando..."
    },
    
    success: {
      title: "¡Felicitaciones!",
      subtitle: "Su Solicitud Está Bajo Revisión",
      whatNext: "¿Qué Sigue?",
      step1: "Nuestro equipo revisará su solicitud y verificará toda la información proporcionada",
      step2: "Contactaremos a sus referencias y empleador para confirmar los detalles de empleo",
      step3: "Recibirá los términos del préstamo y los próximos pasos dentro de 2-3 días hábiles",
      importantInfo: "Información Importante",
      info: [
        "Revise su correo electrónico y teléfono para actualizaciones de nuestro equipo",
        "Su identidad ha sido verificada a través de Stripe Identity",
        "Lo contactaremos usando su método de comunicación preferido",
        "Mantenga su teléfono accesible en caso de que necesitemos información adicional"
      ],
      questions: "¿Preguntas?",
      questionsText: "Si tiene alguna pregunta sobre su solicitud, por favor contacte a nuestro equipo de servicio al cliente."
    },
    
    loading: {
      application: "Cargando Solicitud..."
    },
    
    error: {
      title: "Ocurrió un Error",
      occurred: "Ocurrió un error"
    },
    
    common: {
      loading: "Cargando...",
      back: "Atrás",
      next: "Siguiente",
      continue: "Continuar",
      submit: "Enviar",
      cancel: "Cancelar",
      yes: "Sí",
      no: "No",
      required: "Requerido",
      optional: "Opcional",
      notProvided: "No proporcionado"
    },

    docusign: {
      document: {
        title: "Acuerdo de Préstamo Vehicular",
        companyTagline: "PaySolutions LLC - Servicios de Financiamiento Profesional",
        loanInformation: "📋 Información del Préstamo",
        borrowerInformation: "👤 Información del Prestatario",
        weeklyPaymentSchedule: "📊 Cronograma de Pagos Semanales",
        totalPayments: "Total de {termWeeks} Pagos Semanales",
        personalFinancingAgreement: "📄 Acuerdo de Financiamiento Personal (\"AFP\") - Anexo \"A\"",
        emailSubject: "Acuerdo de Préstamo Vehicular - {loanNumber} - Firma Requerida"
      },
      legal: {
        contractParties: "⚖️ Partes del Contrato",
        borrowerRepresentations: "✅ Declaraciones del Prestatario",
        paymentTerms: "💳 Términos de Pago",
        defaultConditions: "⚠️ Condiciones de Incumplimiento",
        additionalAgreements: "📋 Acuerdos Adicionales",
        signatureSection: "✍️ Firma Electrónica",
        fees: "💰 Tarifas del Sistema iPay (TARIFAS)",
        juryTrialWaiver: "RENUNCIA AL JUICIO POR JURADO. EL PRESTAMISTA Y EL PRESTATARIO POR LA PRESENTE RENUNCIAN CONSCIENTE, VOLUNTARIA E INTENCIONALMENTE AL DERECHO QUE CUALQUIERA DE LOS DOS PUEDA TENER A UN JUICIO POR JURADO.",
        arbitrationProvision: "DISPOSICIÓN DE ARBITRAJE: Cualquier reclamo o disputa entre usted y nosotros será, a su elección o la nuestra, resuelto por arbitraje neutral y vinculante y no por una acción judicial. (Iniciales proporcionadas por separado)",
        acknowledgmentText: "ESTE ACUERDO ESTÁ SUJETO A UN ACUERDO DE ARBITRAJE Y UN REQUISITO DE NOTIFICACIÓN DE DEMANDA PREVIA, COMO SE ESTABLECE EN ESTE ACUERDO. AL FIRMAR ABAJO, RECONOZCO QUE HE LEÍDO Y ENTENDIDO LAS DISPOSICIONES DE ESTE ACUERDO Y ACEPTO LOS TÉRMINOS Y CONDICIONES ESTABLECIDOS EN EL MISMO.",
        contractUnderstanding: "POR LA PRESENTE JURO Y AFIRMO QUE HE LEÍDO Y ENTIENDO LOS TÉRMINOS DE ESTE CONTRATO. (Iniciales requeridas arriba)"
      },
      content: {
        legalAgreementTitle: "Acuerdo de Financiamiento Personal",
        legalAgreementSubtitle: "Pay Solutions LLC - La Forma Simple e Inteligente de Crecer",
        contractIntroduction: "USTED y PAY SOLUTIONS LLC (en adelante denominada \"PS\") están celebrando este acuerdo de financiamiento personal (en adelante denominado \"Acuerdo\" o \"AFP\" indistintamente) con el propósito de un contrato de financiamiento personal para cubrir parcialmente un pago inicial para un vehículo vendido por {purpose} a usted como \"Comprador\" o \"Prestatario\" (en adelante indistintamente), y acuerdan lo siguiente:",
        borrowerDefinition: "PRESTATARIO significará, un individuo (\"Prestatario\"), {borrowerName} con dirección postal en {address}.",
        lenderDefinition: "PRESTAMISTA significará PAY SOLUTIONS LLC (\"PS\"), una Compañía de Responsabilidad Limitada de Florida en su oficina en 575 NW 50th St, Miami, FL 33166, sus sucesores, cesionarios, y cualquier otro portador de este AFP.",
        paymentBeneficiaryDefinition: "BENEFICIARIO DE PAGO significará el concesionario o entidad de quien se está comprando el vehículo.",
        representationIntro: "Usted declara y reconoce que:",
        paymentTermsIntro: "Marque con iniciales para reconocer:",
        defaultConditionsIntro: "Se considerará que está en incumplimiento si ocurre cualquiera de lo siguiente:",
        additionalAgreementsIntro: "Marque con iniciales para reconocer:",
        feesTitle: "Tarifas del Sistema iPay (TARIFAS)",
        processingFeeTitle: "Tarifa de Procesamiento Manual (Tarifa de Procesamiento)",
        processingFeeDescription: "Tarifa aplicada por procesar pagos manualmente (en oficina, por teléfono, o en efectivo).",
        processingFeeAmount: "Monto: $5.00",
        processingFeeAvoidance: "Puede evitarse si el cliente usa pagos automáticos (AutoPay).",
        lateFeeTitle: "Tarifa por Pago Tardío (Tarifa por Retraso)",
        lateFeeDescription: "Tarifa aplicada si han pasado 5 días desde la fecha de vencimiento sin que el cliente haga el pago.",
        lateFeeAmount: "Monto: $15.00",
        defermentFeeTitle: "Tarifa de Diferimiento (Tarifa de Diferimiento)",
        defermentFeeDescription: "Permite extender la fecha de vencimiento del pago actual por 7 días.",
        defermentFeeRestrictions: "No puede aplicarse al primer pago. Solo puede usarse dos (2) veces durante el plazo del préstamo.",
        defermentFeeAmount: "Monto: $10.00",
        returnedPaymentFeeTitle: "Tarifa por Pago Devuelto (Tarifa por Pago Devuelto)",
        returnedPaymentFeeDescription: "Tarifa aplicada cuando un pago es rechazado o devuelto por el banco o entidad procesadora (ej., fondos insuficientes, transacción denegada).",
        returnedPaymentFeeAmount: "Monto: $25.00",
        feesImportantNote: "Nota Importante:",
        feesAutoDebit: "Estos cargos serán debitados automáticamente de la cuenta del cliente o tarjeta de crédito/débito registrada en el sistema iPay.",
        accountVerificationFee: "El primer cargo al registrar al cliente es $1. Esto nos permitirá verificar que la cuenta y/o tarjeta del cliente es correcta, y el cliente acepta este cargo de $1 para la activación de la cuenta.",
        legalAgeText: "Edad Legal. Usted es mayor de edad y tiene la capacidad legal para celebrar este Contrato.",
        vehicleConditionText: "Condición del Vehículo. He inspeccionado minuciosamente, aceptado y aprobado el vehículo motorizado en todos los aspectos, y estoy satisfecho con la condición del vehículo.",
        separateContractText: "Separado del Contrato de Venta. Usted representa y entiende que este no es un acuerdo para comprar el vehículo, sino más bien, un acuerdo para cubrir la porción del pago inicial de dicho vehículo.",
        noOralPromisesText: "Sin Promesas Orales. Usted acepta que este contrato controlará toda discusión y negociación oral y verbal que condujo a este contrato.",
        paymentTermsItem1: "Para todas las disposiciones de este contrato, el tiempo es esencial.",
        paymentTermsItem2: "Monto Principal significará ${principalAmount} (Dólares Estadounidenses) que cubrirá una porción de un pago inicial.",  
        paymentTermsItem3: "Por VALOR RECIBIDO, el Comprador por la presente promete pagar a la orden del Prestamista, el Monto Principal con interés a la tasa anual de ${interestRate}% por ciento, el interés se calculará en base a interés simple de 365/365.",
        paymentTermsItem4: "Todos los pagos se recibirán en o antes del día hábil especificado en el Anexo \"A\". Si un pago no se recibe al final del día hábil aplicable, se evaluará automáticamente una tarifa administrativa fija tardía de $10.00.",
        paymentTermsItem5: "Todos los pagos se recibirán en un Día Hábil en o antes de las 5:00PM Hora del Este (ET).",
        paymentTermsItem6: "Si el pago es devuelto por cualquier razón, el Prestatario pagará una tarifa de pago devuelto de $35.00 bajo demanda.",
        paymentTermsItem7: "Recargo por Pago con Tarjeta. Si un cliente hace un pago usando una tarjeta, se aplicará un recargo del 1.8% del monto del pago.",
        paymentTermsItem8: "El Prestatario puede solicitar hasta dos pagos de diferimiento para extender por siete (7) días la fecha de pago actual. Se cobrará una tarifa de $20.00.",
        paymentTermsItem9: "Sin Penalidad por Pago Anticipado. Este AFP puede ser prepagado en su totalidad o en parte en cualquier momento, sin incurrir en penalidad alguna.",
        defaultItem1: "Usted falla en cumplir cualquier obligación bajo este Contrato.",
        defaultItem2: "El Comprador falla en pagar a tiempo según el cronograma, o dentro de cinco (5) días de la fecha de vencimiento.",
        defaultItem3: "Cualquier declaración(es) materialmente falsa es hecha por el Prestatario.",
        defaultItem4: "Cualquier procedimiento de bancarrota es iniciado por o contra el Prestatario.",
        defaultItem5: "Cancelación o intento de cancelación de este acuerdo unilateralmente por el Prestatario.",
        defaultItem6: "Falla en reportar cambio de nombre, dirección o número de teléfono con al menos treinta (30) días de aviso.",
        gpsTrackingText: "Instalación de Dispositivo GPS/Rastreo. Su vehículo podría potencialmente contar con un DISPOSITIVO GPS/RASTREO y al firmar este documento usted reconoce y da consentimiento para la instalación del dispositivo.",
        privacyWaiverText: "Renuncia a Derechos de Privacidad. Usted acepta que no tiene derechos de privacidad en el rastreo de su vehículo para propósitos de cobranza y/o recuperación.",
        electronicCommunicationsText: "Comunicaciones Electrónicas. Usted da permiso para contactarlo vía teléfono, mensajes de texto SMS, correos electrónicos, o aplicaciones de mensajería."
      },
      headers: {
        applicationDate: "Fecha de Solicitud:",
        requestedLoanAmount: "Monto de Préstamo Solicitado:",
        dealership: "Concesionario:",
        vehicleYear: "Año del Vehículo:",
        make: "Marca:",
        model: "Modelo:",
        vin: "VIN:",
        issueDate: "Fecha de Emisión:",
        firstPaymentDate: "Fecha del Primer Pago:",
        lenderInformation: "🏢 Información del Prestamista",
        borrowerInformation: "👤 Información del Prestatario",
        references: "📞 Referencias",
        financialSummary: "💰 Resumen Financiero",
        acknowledgmentSignatures: "RECONOCIMIENTO Y FIRMAS",
        professionalLendingServices: "Servicios de Préstamos Profesionales",
        trustedFinancialPartner: "Su socio financiero de confianza"
      },
      labels: {
        address: "📍 Dirección:",
        employment: "💼 Empleo:",
        status: "Estado:",
        annualSalary: "Salario Anual:",
        employer: "Empleador:",
        timeWithEmployer: "Tiempo con el Empleador:",
        reference1: "Referencia 1:",
        reference2: "Referencia 2:",
        phone: "Teléfono:",
        printName: "Nombre en Letra de Molde:",
        date: "Fecha:",
        borrowerSignature: "Firma del Prestatario:",
        dealerRepresentative: "Representante del Concesionario:",
        financeCharge: "Cargo Financiero:",
        totalOfPayments: "Total de Pagos:",
        dateOfBirth: "Fecha de Nacimiento:"
      },
      fields: {
        borrowerName: "Nombre del Prestatario:",
        interestRate: "Tasa de Interés:",
        loanType: "Tipo de Préstamo:",
        principalAmount: "Monto Principal:",
        weeklyPayment: "Pago Semanal:",
        termWeeks: "Plazo (Semanas):",
        legalAge: "Edad Legal. Usted es mayor de edad y tiene la capacidad legal para celebrar este Contrato.",
        vehicleCondition: "Condición del Vehículo. He inspeccionado minuciosamente, aceptado y aprobado el vehículo motorizado en todos los aspectos, y estoy satisfecho con la condición del vehículo.",
        separateContract: "Separado del Contrato de Venta. Usted representa y entiende que este no es un acuerdo para comprar el vehículo, sino más bien, un acuerdo para cubrir la porción del pago inicial de dicho vehículo.",
        noOralPromises: "Sin Promesas Orales. Usted acepta que este contrato controlará toda discusión y negociación oral y verbal que condujo a este contrato.",
        gpsTracking: "Instalación de Dispositivo GPS/Rastreo. Su vehículo podría potencialmente contar con un DISPOSITIVO GPS/RASTREO y al firmar este documento usted reconoce y da consentimiento para la instalación del dispositivo.",
        privacyWaiver: "Renuncia a Derechos de Privacidad. Usted acepta que no tiene derechos de privacidad en el rastreo de su vehículo para propósitos de cobranza y/o recuperación.",
        electronicCommunications: "Comunicaciones Electrónicas. Usted da permiso para contactarlo vía teléfono, mensajes de texto SMS, correos electrónicos, o aplicaciones de mensajería.",
        initialToAcknowledge: "Initial para reconocer:",
        paymentNumber: "#",
        dueDate: "Fecha de Vencimiento",
        payment: "Pago",
        principal: "Principal",
        interest: "Interés",
        balance: "Saldo"
      }
    }
  }
};

/**
 * Get translations for a specific language
 */
export function getTranslations(language: Language): Translations {
  return translations[language] || translations.en;
}

/**
 * Simple interpolation function for dynamic text
 */
export function interpolate(text: string, values: Record<string, string>): string {
  return text.replace(/\{(\w+)\}/g, (match, key) => values[key] || match);
}