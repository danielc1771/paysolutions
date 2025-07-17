# Documentation Index

This directory contains all documentation for the iPayUS loan management system.

## Setup Guides

Essential guides for setting up development and production environments:

- **[DocuSign Setup](setup-guides/DOCUSIGN_SETUP.md)** - Configure DocuSign integration for document signing
- **[Stripe Setup](setup-guides/STRIPE_SETUP.md)** - Configure Stripe for payment processing
- **[Twilio Setup](setup-guides/TWILIO_SETUP.md)** - Configure Twilio for SMS verification
- **[Role Setup Guide](setup-guides/ROLE_SETUP_GUIDE.md)** - Configure user roles and permissions

## Deployment Guides

Comprehensive guides for production deployment:

- **[Deployment Checklist](deployment/DEPLOYMENT_CHECKLIST.md)** - Complete checklist for production deployment
- **[Production Deployment Guide](deployment/PRODUCTION_DEPLOYMENT_GUIDE.md)** - Step-by-step production setup
- **[API Transition Guide](deployment/API_TRANSITION_GUIDE.md)** - Migrate APIs from test to production
- **[Stripe Webhook Configuration](deployment/STRIPE_WEBHOOK_CONFIGURATION.md)** - Configure Stripe webhooks
- **[Handoff Summary](deployment/HANDOFF_SUMMARY.md)** - Executive summary for client handoff

## Email Templates

Documentation for email template system:

- **[Email Templates](email-templates/)** - Email template documentation and examples

## Quick Reference

### For Developers
1. Start with [Role Setup Guide](setup-guides/ROLE_SETUP_GUIDE.md) for development accounts
2. Configure services using setup guides
3. Use scripts in `/scripts/` for database setup

### For Production Deployment
1. Begin with [Deployment Checklist](deployment/DEPLOYMENT_CHECKLIST.md)
2. Follow [Production Deployment Guide](deployment/PRODUCTION_DEPLOYMENT_GUIDE.md)
3. Use [API Transition Guide](deployment/API_TRANSITION_GUIDE.md) for service configuration
4. Reference [Handoff Summary](deployment/HANDOFF_SUMMARY.md) for overview

### For Client Handoff
- **Primary Document**: [Handoff Summary](deployment/HANDOFF_SUMMARY.md)
- **Technical Details**: [Production Deployment Guide](deployment/PRODUCTION_DEPLOYMENT_GUIDE.md)
- **API Configuration**: [API Transition Guide](deployment/API_TRANSITION_GUIDE.md)

## Database Scripts

Database-related scripts are located in `/scripts/`:
- **Migrations**: `/scripts/migrations/` - Database schema changes
- **Setup**: `/scripts/setup/` - Initial setup and test data