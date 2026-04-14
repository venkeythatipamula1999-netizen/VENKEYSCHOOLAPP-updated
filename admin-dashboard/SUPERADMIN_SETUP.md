# Super Admin Access Setup

## How the security works

When anyone tries to login, the app:
1. Checks Firebase Auth — is the email/password correct?
2. Checks Firestore `superadmins` collection — is this UID listed as a super admin?
3. If NOT in the `superadmins` collection → instantly signs them out and shows "Access denied"

This means **even if a school admin, teacher, parent, or driver knows the password,
they cannot get in** unless their UID is in the `superadmins` collection.

---

## One-time Setup — Add your Super Admin to Firestore

1. Go to **Firebase Console** → https://console.firebase.google.com
2. Select project: **school-app-87900**
3. Go to **Firestore Database**
4. Create a collection called: `superadmins`
5. Add a document where:
   - **Document ID** = your Super Admin's Firebase UID
   - Add any field, e.g: `email` = "your@email.com"

### How to find the Super Admin UID:
- Firebase Console → Authentication → Users → find the email → copy the UID

### Example Firestore structure:
```
superadmins/
  └── aBcDeFgHiJkLmNoPqRsT   ← document ID is the UID
        email: "superadmin@vidhayalayam.com"
        addedAt: "2024-01-01"
```

---

## What happens when others try to login

| User | Result |
|------|--------|
| Super Admin (UID in superadmins) | ✅ Access granted |
| School Admin | ❌ "Access denied. This portal is for Super Admins only." |
| Teacher | ❌ "Access denied. This portal is for Super Admins only." |
| Parent | ❌ "Access denied. This portal is for Super Admins only." |
| Driver | ❌ "Access denied. This portal is for Super Admins only." |
| Random person | ❌ "Invalid credentials" (Firebase Auth rejects them) |

---

## To add multiple Super Admins
Just add more documents to the `superadmins` collection, one per UID.

## To remove a Super Admin's access
Delete their document from the `superadmins` collection.
They will be signed out automatically on their next page load.
