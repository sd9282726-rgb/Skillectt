# Skillect Community Safety Policy

Skillect is designed for teenagers. Safety rules apply to posts, comments, profile photos, usernames, bios, messages, and community content.

## Zero-tolerance prohibited content
- Pornography, explicit sexual content, and sexually explicit nudity.
- Sexual solicitation, grooming, coercion, exploitation, or attempts to move minors into sexual conversations.
- Any sexualized content involving a minor, including requests, sharing, or attempted distribution of child sexual abuse material.
- Threats, targeted harassment, doxxing, and credible encouragement of self-harm or violence.

## Enforcement
1. A report is recorded with the reporter, target, reason, and time.
2. The reported content is hidden from discovery while a high-severity safety report is reviewed; preserve evidence securely for authorized review.
3. A trained moderator reviews the content and relevant account history. Automated classifiers may prioritize review, but a classifier score or report count alone is not a final finding.
4. Confirmed pornography, sexual exploitation, grooming, or sexual content involving minors results in permanent account termination and removal of the content. Repeat or severe harassment, threats, and malicious exploitation may also result in permanent termination.
5. False or malicious reports do not automatically punish the reported user. Moderators must record a reason for every enforcement action.
6. Provide a clear appeal channel for mistaken identity, compromised accounts, or moderation errors. An appeal does not restore content that is illegal or presents an immediate safety risk.

## Product safeguards required before public launch
- Pre-publication image/video moderation; reject or quarantine high-risk uploads before they appear in feeds.
- Text moderation for captions, comments, bios, usernames, and messages.
- Report and block controls on posts and profiles, with a monitored moderation queue.
- Rate limits and audit logs for reports and moderation actions.
- Admin-only ban/review tools; ordinary clients must never be able to set their own ban status or resolve reports.
- Push notifications must not include sensitive report details or explicit content.

## Important implementation boundary
This document defines policy, not an operational moderation service. Automated scanning, moderator tooling, secure evidence handling, ban enforcement, appeals, and push delivery must be implemented and tested before Skillect is opened to the public. Never claim that NSFW detection or permanent bans are active until those controls are deployed and verified.
