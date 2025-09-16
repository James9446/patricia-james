# Wedding Website Admin Guide

## Guest List Management

### Overview
This guide explains how to populate and manage the guest list for the wedding website. The system is designed to handle complex relationships including couples, plus-ones, and individual guests.

### Guest Types

#### 1. Individual Guests
- **Single guests** with no partner
- May or may not be allowed a plus-one
- Example: Single friends, colleagues

#### 2. Couples (Primary + Partner)
- **Primary guest**: The main person who will receive the invitation
- **Partner**: Linked to the primary guest
- Both can RSVP, but only the primary guest needs to create an account
- Example: Married couples, long-term partners

#### 3. Plus-Ones
- Additional guests that primary guests can bring
- Name and email collected during RSVP process
- Added to database when RSVP is submitted

### Database Schema for Guest Relationships

```sql
-- Primary guest (receives invitation)
INSERT INTO guests (first_name, last_name, email, is_primary_guest, plus_one_allowed) 
VALUES ('Maria', 'Garcia', 'maria@example.com', true, true);

-- Partner (linked to primary guest)
INSERT INTO guests (first_name, last_name, email, is_primary_guest, plus_one_allowed) 
VALUES ('John', 'Doe', 'john@example.com', false, false);

-- Link them as partners
UPDATE guests 
SET partner_id = (SELECT id FROM guests WHERE email = 'john@example.com')
WHERE email = 'maria@example.com';

UPDATE guests 
SET partner_id = (SELECT id FROM guests WHERE email = 'maria@example.com')
WHERE email = 'john@example.com';
```

### Admin Workflow

#### Step 1: Prepare Your Guest List
Create a spreadsheet with the following columns:
- `first_name`
- `last_name` 
- `email`
- `phone` (optional)
- `guest_type` (individual, primary, partner)
- `partner_email` (if applicable)
- `plus_one_allowed` (true/false)
- `admin_notes` (internal notes)

#### Step 2: Categorize Your Guests

**Individual Guests:**
```
John Smith, john@example.com, individual, false
Sarah Johnson, sarah@example.com, individual, true
```

**Couples (Primary Guest):**
```
Maria Garcia, maria@example.com, primary, true
John Doe, john@example.com, partner, false
```

#### Step 3: Database Population Script

Create a script to populate the database:

```javascript
// Example admin script for populating guests
const guestData = [
  // Individual guests
  {
    first_name: 'John',
    last_name: 'Smith',
    email: 'john@example.com',
    is_primary_guest: true,
    plus_one_allowed: false
  },
  
  // Couples
  {
    first_name: 'Maria',
    last_name: 'Garcia', 
    email: 'maria@example.com',
    is_primary_guest: true,
    plus_one_allowed: true,
    partner: {
      first_name: 'John',
      last_name: 'Doe',
      email: 'john@example.com'
    }
  }
];

// Insert guests and create relationships
for (const guest of guestData) {
  // Insert primary guest
  const primaryGuest = await insertGuest(guest);
  
  // Insert partner if exists
  if (guest.partner) {
    const partnerGuest = await insertGuest({
      ...guest.partner,
      is_primary_guest: false,
      plus_one_allowed: false
    });
    
    // Link them as partners
    await linkPartners(primaryGuest.id, partnerGuest.id);
  }
}
```

### RSVP Flow for Different Guest Types

#### Individual Guest RSVP
1. Guest logs in with their email
2. Sees their invitation details
3. Selects attending/not attending
4. If plus-one allowed: provides plus-one name/email
5. Submits RSVP

#### Couple RSVP (Primary Guest)
1. Primary guest logs in
2. Sees both their info and partner's info
3. Selects attending/not attending for both
4. If plus-one allowed: provides plus-one details
5. Submits RSVP for both

#### Couple RSVP (Partner)
1. Partner logs in (if they create account)
2. Sees their info and primary guest's info
3. Can update RSVP for both
4. Same plus-one options as primary guest

### Key Features

#### 1. Flexible Partner Relationships
- Partners can both create accounts
- Either partner can RSVP for both
- System prevents duplicate RSVPs

#### 2. Plus-One Management
- Only allowed guests can bring plus-ones
- Plus-one details collected during RSVP
- Plus-ones added to database automatically

#### 3. Admin Controls
- View all guests and their relationships
- Track RSVP status
- Manage plus-one approvals
- Internal notes for each guest

### Database Views for Admin

#### Guest Pairs View
```sql
SELECT * FROM guest_pairs;
-- Shows all primary guests with their partners
```

#### RSVP Summary View
```sql
SELECT * FROM rsvp_summary;
-- Shows RSVP status for all primary guests
```

### API Endpoints for Admin

#### Get All Guests
```
GET /api/admin/guests
```

#### Get Guest Relationships
```
GET /api/admin/guests/relationships
```

#### Get RSVP Summary
```
GET /api/admin/rsvps/summary
```

#### Update Guest Information
```
PUT /api/admin/guests/:id
```

### Best Practices

1. **Always set primary guests first** - Partners reference primary guests
2. **Use consistent email addresses** - These are used for login
3. **Set plus_one_allowed carefully** - Controls who can bring additional guests
4. **Use admin_notes** - Track special requirements or notes
5. **Test with sample data** - Verify relationships work correctly

### Common Scenarios

#### Scenario 1: Married Couple
- Both get invitations
- Either can RSVP for both
- No plus-one needed

#### Scenario 2: Single Friend with Plus-One
- Friend gets invitation
- Can bring a date
- Must provide date's name/email

#### Scenario 3: Family with Adult Children
- Parents are primary guests
- Adult children are partners
- Each can RSVP independently

#### Scenario 4: Friend Group
- Each person is individual guest
- Some allowed plus-ones, some not
- Each RSVPs separately

### Troubleshooting

#### Issue: Partner not showing up in RSVP
- Check partner_id is set correctly
- Verify both guests are in database
- Check is_primary_guest flags

#### Issue: Plus-one not allowed
- Verify plus_one_allowed is true
- Check guest permissions
- Review RSVP form logic

#### Issue: Duplicate RSVPs
- System prevents duplicates per guest
- Partners can both RSVP (updates same record)
- Check for multiple guest records

### Security Considerations

1. **Admin access only** - Guest management requires admin privileges
2. **Data validation** - All inputs validated before database insertion
3. **Audit trail** - All changes tracked with timestamps
4. **Backup strategy** - Regular database backups before major changes
