# Schema v2 Review & Refinement

## Current Schema Analysis

### ✅ **Strengths**
1. **Flexible relationships** - Handles couples, individuals, plus-ones
2. **Clear data structure** - Primary vs partner distinction
3. **Admin-friendly** - Easy to populate and manage
4. **Scalable design** - Can handle complex scenarios

### 🤔 **Areas for Review**

## 1. Guest Relationship Model

### Current Approach
```sql
-- Guests table with partner_id reference
partner_id UUID REFERENCES guests(id) ON DELETE SET NULL
is_primary_guest BOOLEAN DEFAULT true
```

### Questions to Consider
- **Is the partner_id approach clear enough?**
- **Should we have a separate "relationships" table?**
- **How do we handle complex families (parents + adult children)?**

### Alternative Approaches
```sql
-- Option A: Current approach (simple)
guests.partner_id -> guests.id

-- Option B: Relationships table (more flexible)
CREATE TABLE guest_relationships (
    id UUID PRIMARY KEY,
    guest1_id UUID REFERENCES guests(id),
    guest2_id UUID REFERENCES guests(id),
    relationship_type VARCHAR(20), -- 'spouse', 'partner', 'parent', 'child'
    is_primary BOOLEAN DEFAULT false
);

-- Option C: Family groups
CREATE TABLE guest_groups (
    id UUID PRIMARY KEY,
    group_name VARCHAR(100), -- 'Smith Family', 'Garcia Couple'
    group_type VARCHAR(20)   -- 'couple', 'family', 'individual'
);
```

## 2. Plus-One Management

### Current Approach
```sql
-- In guests table
plus_one_allowed BOOLEAN DEFAULT false
plus_one_name VARCHAR(200)
plus_one_email VARCHAR(255)

-- In rsvps table
plus_one_attending BOOLEAN DEFAULT false
plus_one_name VARCHAR(200)
plus_one_email VARCHAR(255)
```

### Questions to Consider
- **Should plus-ones be separate guest records?**
- **How do we handle plus-ones who become regular guests?**
- **What if someone wants to bring multiple plus-ones?**

### Alternative Approaches
```sql
-- Option A: Current approach (simple)
-- Plus-one info stored in guests and rsvps tables

-- Option B: Separate plus-ones table
CREATE TABLE plus_ones (
    id UUID PRIMARY KEY,
    guest_id UUID REFERENCES guests(id),
    rsvp_id UUID REFERENCES rsvps(id),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(255),
    is_attending BOOLEAN DEFAULT false
);

-- Option C: Plus-ones as guest records
-- Create actual guest records for plus-ones
-- Link them to primary guest via relationship
```

## 3. RSVP Complexity

### Current Approach
```sql
-- Single RSVP record per guest
response_status VARCHAR(20) -- 'attending', 'not_attending', 'pending'
party_size INTEGER
partner_attending BOOLEAN
plus_one_attending BOOLEAN
```

### Questions to Consider
- **How do we handle partial responses (one partner attending, other not)?**
- **Should each person have their own RSVP record?**
- **How do we track who submitted the RSVP?**

### Alternative Approaches
```sql
-- Option A: Current approach (single record per primary guest)
-- One RSVP record handles the entire party

-- Option B: Individual RSVP records
-- Each person (guest, partner, plus-one) gets their own RSVP record
-- Link them via group_id or family_id

-- Option C: Hierarchical RSVP
-- Primary guest RSVP with sub-records for partners/plus-ones
```

## 4. Data Consistency

### Current Issues
- **Duplicate plus-one info** (guests table + rsvps table)
- **Partner info scattered** across multiple fields
- **No clear audit trail** for who made changes

### Questions to Consider
- **Should we normalize the data more?**
- **Do we need audit trails for RSVP changes?**
- **How do we handle data updates?**

## 5. Admin Workflow

### Current Approach
- Manual script to populate guests
- Direct database manipulation
- No admin interface

### Questions to Consider
- **Do you need a web-based admin interface?**
- **Should there be import/export functionality?**
- **Do you need approval workflows for plus-ones?**

## 6. Real-World Scenarios

### Scenario 1: Married Couple
- **Current**: ✅ Works well
- **Both get invitations, either can RSVP for both**

### Scenario 2: Single Friend with Plus-One
- **Current**: ✅ Works well
- **Friend can bring a date, provides name/email**

### Scenario 3: Family with Adult Children
- **Current**: ⚠️ Could be confusing
- **Parents + adult children - who's primary?**

### Scenario 4: Friend Group
- **Current**: ✅ Works well
- **Each person is individual guest**

### Scenario 5: Divorced Parents
- **Current**: ⚠️ Unclear
- **Both parents invited separately, but same children**

### Scenario 6: Plus-One Becomes Regular Guest
- **Current**: ⚠️ No clear path
- **Plus-one gets their own invitation later**

## 7. Technical Considerations

### Performance
- **Current**: Good with proper indexes
- **Views**: Helpful for common queries

### Scalability
- **Current**: Handles hundreds of guests well
- **Could handle thousands with proper optimization**

### Maintenance
- **Current**: Simple structure, easy to understand
- **Migration**: Safe and reversible**

## Recommendations for Refinement

### Option 1: Minimal Changes (Recommended)
Keep current approach but add:
- **Audit trail** for RSVP changes
- **Better plus-one handling** (single source of truth)
- **Clearer admin workflow**

### Option 2: Moderate Changes
- **Separate plus-ones table** for better tracking
- **RSVP audit trail** for who made changes
- **Admin interface** for guest management

### Option 3: Major Restructure
- **Relationships table** for complex families
- **Individual RSVP records** for each person
- **Full admin interface** with approval workflows

## Questions for You

1. **How complex are your guest relationships?**
   - Mostly couples + individuals?
   - Any complex families?
   - Any special cases?

2. **How do you want to handle plus-ones?**
   - Simple name/email collection?
   - Full guest records?
   - Approval process?

3. **What's your admin workflow preference?**
   - Script-based (current)?
   - Web interface?
   - Import from spreadsheet?

4. **Any special scenarios to consider?**
   - Divorced parents?
   - Adult children living at home?
   - Friend groups?

5. **How important is data consistency?**
   - Simple is better?
   - Need audit trails?
   - Want approval workflows?

## Next Steps

1. **Review these questions**
2. **Identify any missing scenarios**
3. **Choose refinement approach**
4. **Update schema accordingly**
5. **Test with real data**

What are your thoughts on these areas? Any specific scenarios or requirements we should address?
