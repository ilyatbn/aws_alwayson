// Menu configuration for AWS AlwaysON extension
// This file contains all menu structure, form fields, and help text
// Easy to modify for adding/removing options

const MENU_CONFIG = {
  tabs: [
    {
      id: "options_main",
      label: "General",
      active: true
    },
    {
      id: "options_google", 
      label: "Google",
      active: false
    },
    {
      id: "options_awssso",
      label: "AWS SSO", 
      active: false
    }
  ],
  
  sections: {
    options_main: [
      {
        type: "select",
        id: "idp_type",
        label: "IDP Type",
        placeholder: "Select an option",
        options: [
          { value: "none", label: "Select an option" },
          { value: "google", label: "Google Workspace" },
          { value: "awssso", label: "AWS SSO" }
        ],
        helpText: "Select one of the supported Identity Provider services."
      },
      {
        type: "text",
        id: "platform",
        label: "OS platform for STS CLI",
        placeholder: "e.g., windows, macos, linux",
        helpText: "Each OS platform has its own command-line for setting environment variables. You can change it here."
      },
      {
        type: "text", 
        id: "roleCount",
        label: "Role count",
        placeholder: "Role count in menu",
        helpText: "The amount of roles you will be using in the menu."
      },
      {
        type: "checkbox",
        id: "clientupdate",
        label: "Update local AWS Credentials profile",
        helpText: "If enabled, updates the AWS AlwaysON service with new credentials, which then updates the [default] profile in the aws credentials file."
      }
    ],
    
    options_google: [
      {
        type: "text",
        id: "saml_provider",
        label: "SAML Provider name",
        placeholder: "SAML Provider",
        helpText: "PrincipalArn saml-provider name set in AWS."
      },
      {
        type: "text",
        id: "organization_domain",
        label: "Your organization's domain name",
        placeholder: "Organization domain name",
        helpText: "Used to locate the correct account when logged in to several Google accounts at once."
      },
      {
        type: "text",
        id: "google_idpid",
        label: "Google Identity Provider ID",
        placeholder: "Google Identity Provider ID",
        helpText: "Easiest way to locate it is by copying the link to AWS in your Google apps menu. It will contain idpid=YOUR_IDP_ID"
      },
      {
        type: "text",
        id: "google_spid",
        label: "Google Service Provider ID",
        placeholder: "Google Service Provider ID",
        helpText: "Easiest way to locate it is by copying the link to AWS in your Google apps menu. It will contain spid=YOUR_SP_ID"
      },
      {
        type: "text",
        id: "refresh_interval",
        label: "Token refresh interval (Minutes)",
        placeholder: "Token auto-refresh interval",
        helpText: "Keep this under 60. For some reason, AWS Web console session timeout is set to 1 hour maximum even if your IAM role is configured for more."
      },
      {
        type: "text",
        id: "session_duration",
        label: "STS Token session duration in seconds",
        placeholder: "Token session duration in seconds",
        helpText: "Make sure you do not exceed the value configured in the IAM role. If you don't know it, keep at the default of 1 hour."
      }
    ],
    
    options_awssso: [
      {
        type: "text",
        id: "awssso_subdomain",
        label: "AWS SSO Subdomain",
        placeholder: "Subdomain for awsapps.com",
        helpText: "Used to start the SSO process using https://subdomain.awsapps.com"
      },
      {
        type: "text",
        id: "saml_idp_domain",
        label: "SAML IDP domain",
        placeholder: "Your IDP domain. Used for extension permissions. Leave empty for Google Workspace.",
        helpText: "AWS SSO redirects to your custom domain for SAML authentication. We need to add permissions for the extension to access this domain. Can leave blank for Google Workspace"
      },
      {
        type: "text",
        id: "refresh_interval_sso",
        label: "SSO refresh interval (Minutes)",
        placeholder: "Token and accounts auto-refresh interval.",
        helpText: "AWS SSO has a global token set for all accounts. This will trigger a new tab to open browse to the SSO login page."
      },
      {
        type: "select",
        id: "sso_tab_visible",
        label: "Show SSO login process tab",
        options: [
          { value: "true", label: "True" },
          { value: "false", label: "False" }
        ],
        helpText: "Sometimes the tab for the SSO process needs to be visible due to requiring user interaction. Select False to hide it."
      }
    ]
  }
}; 