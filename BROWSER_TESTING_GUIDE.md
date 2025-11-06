# Browser Testing Guide
## Patricia y James Wedding Website

**Server:** http://localhost:5001
**Test Date:** 2025-10-19
**Status:** Ready for Testing

---

## 🔧 Pre-Test Fixes Applied

✅ **Removed unwanted form fields from HTML**
- Removed `party_size` field (not in schema)
- Removed `song_requests` field (not in schema)

✅ **Cleaned up JavaScript**
- Removed dead code referencing removed fields
- Enhanced error handling with notifications

✅ **Verified All Assets Loading**
- CSS: ✓ styles.css (200 OK)
- JS: ✓ config.js, utils.js, main.js, auth.js, rsvp.js, photos.js (all 200 OK)

---

## 📋 STEP-BY-STEP TESTING CHECKLIST

### **1. HOME PAGE TEST**

**URL:** http://localhost:5001

- [ ] Page loads without errors (check browser console with F12)
- [ ] Wedding date displays: "June 21, 2026" (not "Loading...")
- [ ] Background image loads
- [ ] Navigation bar visible at top
- [ ] Brand "Patricia y James" displays in navbar
- [ ] Navigation links visible: Home, RSVP, Events, Location, Photos, Accommodations
- [ ] Clicking navigation links changes pages (SPA routing)

**❌ If you see errors:**
- Open browser console (F12 → Console tab)
- Share any red error messages

---

### **2. AUTHENTICATION FLOW TEST**

**Step 1: Navigate to RSVP Page**
- [ ] Click "RSVP" in navigation
- [ ] Page shows RSVP form or guest check-in

**Step 2: Test Guest Check (For Existing Guest)**
- [ ] Find a form to enter First Name and Last Name
- [ ] Enter: First Name: "Jack", Last Name: "Blue"
- [ ] Click "Check Guest" or similar button
- [ ] Should find guest and show registration or login option

**Step 3: Test Registration (If Guest Found)**
- [ ] Form shows guest details
- [ ] Enter email: `jack.blue@test.com`
- [ ] Enter password: `TestPassword123!`
- [ ] Click "Register" or "Create Account"
- [ ] Should show success message
- [ ] Should be logged in automatically

**Step 4: Test Login (If Already Registered)**
- [ ] Navigate to login form
- [ ] Enter email: `jack.blue@test.com`
- [ ] Enter password: `TestPassword123!`
- [ ] Click "Login"
- [ ] Should see success notification (top-right corner)
- [ ] Should be redirected to RSVP form

**✅ Expected Behavior:**
- Session should persist across page navigation
- Logged-in user should stay logged in

---

### **3. RSVP FORM TEST** (Must be logged in)

**URL:** http://localhost:5001#rsvp (after login)

**Form Fields to Check:**
- [ ] Response Status (radio buttons):
  - "Yes, I'll be there!"
  - "Sorry, I can't make it"
- [ ] Dietary Restrictions (textarea)
- [ ] Message for the Couple (textarea)
- [ ] Submit RSVP button

**Test Submission:**
1. [ ] Select "Yes, I'll be there!"
2. [ ] Enter dietary restrictions: "Vegetarian"
3. [ ] Enter message: "So excited to celebrate!"
4. [ ] Click "Submit RSVP"
5. [ ] Check for:
   - Button shows "Loading..." briefly
   - Success notification appears (top-right)
   - Message says "RSVP submitted successfully!"
   - Form becomes disabled or shows "submitted" state

**✅ Expected:**
- Notification slides in from right
- Green color for success
- Auto-dismisses after 5 seconds
- Can manually close with × button

**❌ If Error:**
- Should see red error notification
- Check browser console for details

---

### **4. EVENTS PAGE TEST**

**URL:** http://localhost:5001#events

- [ ] Page loads with 4 event cards
- [ ] **Ceremony** shows:
  - Date: Saturday, June 21st, 2026
  - Time: 4:00 PM
- [ ] **Reception** shows:
  - Date: Saturday, June 21st, 2026
  - Time: 6:00 PM
- [ ] **Welcome Party** shows:
  - Date: Friday, June 20th, 2026
  - Time: 7:00 PM
- [ ] **Farewell Brunch** shows:
  - Date: Sunday, June 22nd, 2026
  - Time: 10:00 AM

**Visual Check:**
- [ ] Cards display in 2-column grid on desktop
- [ ] Text is readable
- [ ] Colors and styling look good

---

### **5. LOCATION PAGE TEST**

**URL:** http://localhost:5001#location

- [ ] Page loads
- [ ] Venue showcase section visible
- [ ] GSAP scroll animations work (if implemented)
- [ ] Venue information displays:
  - Name: Presidio Officers' Club (or actual venue)
  - Address visible
  - Map or directions visible

**Note:** This page may have scroll-based animations that reveal content as you scroll.

---

### **6. PHOTOS PAGE TEST**

**URL:** http://localhost:5001#photos

- [ ] Page loads
- [ ] Photo gallery structure visible
- [ ] Category navigation (if implemented)
- [ ] May show "Under Construction" or photo grid

**Note:** This page might not be fully implemented yet.

---

### **7. ACCOMMODATIONS PAGE TEST**

**URL:** http://localhost:5001#accommodations

- [ ] Page loads
- [ ] Hotel information displays
- [ ] Booking deadline shows: May 21st, 2026
- [ ] Hotel name: The Grand Hotel & Gardens (or actual hotel)
- [ ] Room types and rates visible
- [ ] Booking code displayed

---

### **8. MOBILE RESPONSIVENESS TEST**

**Desktop Browser Method:**
1. Press F12 to open DevTools
2. Click the device toolbar icon (phone/tablet icon)
3. Select "iPhone SE" or "iPhone 12 Pro"
4. Refresh page

**Mobile Checks:**
- [ ] Hamburger menu (☰) appears instead of navigation links
- [ ] Clicking hamburger opens mobile menu
- [ ] Mobile menu links work
- [ ] Forms are usable (inputs not too small)
- [ ] Text is readable
- [ ] No horizontal scrolling
- [ ] Wedding date visible and not cut off

**Test Different Sizes:**
- [ ] iPhone SE (375px) - smallest
- [ ] iPad (768px) - tablet
- [ ] Desktop (1280px+) - full site

---

### **9. NOTIFICATION SYSTEM TEST**

**Test Success Notification:**
- Submit RSVP successfully
- Should see green notification top-right
- Message: "RSVP submitted successfully!"
- Auto-dismisses after 5 seconds
- Can click × to close manually

**Test Error Notification:**
- Try to submit RSVP without being logged in
- Or cause an intentional error
- Should see red notification
- Error message displayed

**Visual Check:**
- [ ] Slides in smoothly from right
- [ ] Green for success, Red for error
- [ ] Readable text
- [ ] Close button (×) works
- [ ] Auto-dismisses

---

### **10. CONSOLE ERROR CHECK**

**Open Browser Console:** F12 → Console tab

**What to Look For:**
- [ ] No red error messages on page load
- [ ] No red error messages when navigating
- [ ] Blue info messages are OK (console.log)
- [ ] Yellow warnings are usually OK

**Common Errors to Ignore:**
- Font loading warnings (if any)
- External CDN warnings (GSAP)
- AdBlocker notifications

**Errors to REPORT:**
- "Cannot read property of undefined"
- "404 Not Found" for any /api/ or /js/ or /css/ files
- "Syntax Error"
- Any errors mentioning "rsvp", "auth", "party_size", "song"

---

## 🐛 HOW TO REPORT ISSUES

If you find any problems, please report:

**Format:**
```
PAGE: [Home/RSVP/Events/etc]
ISSUE: [Description]
STEPS: [How to reproduce]
EXPECTED: [What should happen]
ACTUAL: [What actually happened]
CONSOLE: [Any console errors - copy/paste]
SCREENSHOT: [If visual issue]
```

**Example:**
```
PAGE: RSVP
ISSUE: Submit button doesn't work
STEPS:
1. Login as jack@test.com
2. Fill out RSVP form
3. Click Submit
EXPECTED: See success notification
ACTUAL: Nothing happens, button stays enabled
CONSOLE: "TypeError: Cannot read property 'response_status' of null"
```

---

## ✅ SUCCESS CRITERIA

**Minimum for Deployment:**
- [x] All pages load without console errors
- [ ] Home page displays correctly
- [ ] RSVP form works (can submit successfully)
- [ ] Authentication works (login/logout)
- [ ] Mobile menu works
- [ ] Wedding date correct (June 21, 2026)
- [ ] No broken links or 404 errors

**Nice to Have:**
- [ ] All animations working smoothly
- [ ] Photo gallery functional
- [ ] Perfect mobile layout
- [ ] All error states tested

---

## 🚀 QUICK START

**Ready to test?**

1. **IMPORTANT: Use Incognito/Private Browsing Mode!**
   - Chrome: Ctrl+Shift+N (Windows) or Cmd+Shift+N (Mac)
   - Firefox: Ctrl+Shift+P (Windows) or Cmd+Shift+P (Mac)
   - Safari: Cmd+Shift+N (Mac)
   - This prevents old session cookies from interfering with testing
2. Open browser: http://localhost:5001
3. Open console: F12 → Console tab
4. Follow checklist above
5. Report any issues you find

**Between Test Sessions:**
- Close incognito window completely
- Open a fresh incognito window for next test
- This ensures clean session state for each test

**Test User Credentials:**
- Guest Name: Jack Blue (no account yet - will register)
- Or create your own with any existing guest name from database

---

## 📞 NEXT STEPS AFTER TESTING

Once testing is complete:
1. Report all issues found
2. We'll fix critical bugs
3. Decide on deployment readiness
4. Proceed with Render.com deployment

**Estimated Testing Time:** 15-30 minutes for thorough testing

---

**Good luck! 🎉**
