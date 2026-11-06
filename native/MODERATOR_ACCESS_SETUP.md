# Moderator access and operation

## Grant moderator access

The mobile moderation tab is shown only when the signed-in user's trusted JWT `app_metadata.role` is `moderator` or `admin`. The database checks the same claim in `private.is_moderator()`; a client-editable profile field or user metadata value is not trusted.

A project Owner/Admin must assign the role to the intended Auth user from Supabase Dashboard → Authentication → Users → select the account → Edit app metadata. Set:

```json
{
  "role": "moderator"
}
```

Use `admin` only for a trusted platform administrator. Never store this role in `user_metadata`, profile columns, or app-side preferences. After changing app metadata, the user must sign out and sign in again to receive a JWT containing the updated trusted claim.

## Moderator dashboard

The native Android and iOS apps show a Moderation tab to moderator/admin accounts. It provides:
- Pending user reports.
- Hide reported posts and comments without deleting the evidence row.
- Resolve reports.
- Permanently ban the author of a reported post or comment.
- Review account appeals; accepting an appeal removes the enforcement row and records the removal in the audit log.

All operations are additionally checked by Supabase RLS and database triggers. The mobile UI is not the security boundary.

## Restrictions and appeals

Restricted accounts are held in a limited screen where they can submit one open appeal. Posting, comments, messages, follows, likes, saves, profile edits and community membership writes are rejected by database triggers while an enforcement row exists. A moderator may accept or reject an appeal. Accepting removes the active enforcement; rejecting leaves the restriction in place.

## Operational cautions

- Assign moderator access only to trained, trusted reviewers.
- A permanent ban is a consequential decision. Review the reported content and context before acting.
- Hiding a post/comment prevents it from appearing to ordinary users; moderators can still retrieve it for review.
- The current mobile queue is a first operational surface, not a full case-management/evidence-retention system.
- Automated image screening remains unavailable until Sightengine secrets are configured. Video, text, grooming/solicitation, and specialist child-safety screening still require dedicated controls and testing.
