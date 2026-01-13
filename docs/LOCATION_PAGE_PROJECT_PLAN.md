# Location Page - Interactive 3D Experience
## Project Plan & Progress Tracker

**Project Goal:** Create an unforgettable interactive scroll-driven experience transitioning from SF skyline silhouette → city map → venue zoom → venue details.

**Status:** 🚧 In Progress
**Started:** November 30, 2025
**Target Completion:** TBD

---

## 🎯 Project Overview

### Vision
An elegant, scroll-controlled 3D transition experience in three seamless phases:
1. **Phase 1:** Side-view SF skyline silhouette → Top-down stylized SF map (with north orientation)
2. **Phase 2:** Zoom into Presidio/Officers Club location on map
3. **Phase 3:** Fade to venue details and photos (admin-editable)

### Success Criteria
- ✅ Smooth, reversible scroll-based transitions
- ✅ Works on desktop and mobile
- ✅ Performance: 60fps on modern devices
- ✅ Admin can edit venue content
- ✅ Memorable "wow factor" experience

---

## 📋 Development Phases

### **PHASE 1: Foundation & Setup** ⏳
**Goal:** Set up Three.js, create basic scene, implement scroll control

#### Tasks:
- [ ] 1.1 - Install and configure Three.js
- [ ] 1.2 - Set up basic scene, camera, renderer
- [ ] 1.3 - Implement scroll handler with GSAP ScrollTrigger
- [ ] 1.4 - Create progress-based animation system (0-1 mapping)
- [ ] 1.5 - Test scroll responsiveness

**Estimated Time:** 2-3 hours
**Status:** Not Started

---

### **PHASE 2: Skyline → Map Transition** ⏳
**Goal:** Build Phase 1 - skyline silhouette transitioning to city map

#### Assets Needed:
- [ ] SF skyline silhouette geometry
  - Transamerica Pyramid
  - Salesforce Tower
  - Golden Gate Bridge (simplified)
  - Sutro Tower
  - Other iconic buildings
- [ ] Stylized SF city map texture/geometry
- [ ] Background gradient/sky

#### Tasks:
- [ ] 2.1 - Create SF skyline silhouette (simplified 3D geometry)
- [ ] 2.2 - Create stylized SF map (texture or procedural)
- [ ] 2.3 - Set up camera positions (side view → top-down)
- [ ] 2.4 - Implement camera rotation and position interpolation
- [ ] 2.5 - Add north orientation alignment
- [ ] 2.6 - Smooth geometry morphing/fade transition
- [ ] 2.7 - Polish lighting and materials
- [ ] 2.8 - Test and refine timing

**Estimated Time:** 6-8 hours
**Status:** Not Started

---

### **PHASE 3: Map Zoom to Presidio** ⏳
**Goal:** Build Phase 2 - zoom from full SF map to Officers Club location

#### Assets Needed:
- [ ] Detailed Presidio area on map
- [ ] Officers Club marker/highlight
- [ ] Coordinate data (lat/lon of venue)

#### Tasks:
- [ ] 3.1 - Identify Officers Club coordinates on map
- [ ] 3.2 - Create venue marker (pin, glow, or highlight)
- [ ] 3.3 - Implement camera zoom interpolation
- [ ] 3.4 - Add smooth easing to zoom
- [ ] 3.5 - Ensure map detail visibility at zoom level
- [ ] 3.6 - Test zoom range and focal point
- [ ] 3.7 - Polish transition smoothness

**Estimated Time:** 4-5 hours
**Status:** Not Started

---

### **PHASE 4: Venue Details Section** ⏳
**Goal:** Build Phase 3 - fade to venue information and photos

#### Database Schema:
```sql
CREATE TABLE venue_content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  section_name VARCHAR(100) NOT NULL UNIQUE, -- 'officers_club'
  title VARCHAR(255),
  description TEXT,
  address TEXT,
  directions_url TEXT,
  parking_info TEXT,
  additional_info JSONB,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE venue_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venue_content_id UUID REFERENCES venue_content(id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  caption TEXT,
  display_order INTEGER DEFAULT 0,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Tasks:
- [ ] 4.1 - Create database schema for venue content
- [ ] 4.2 - Create migration for venue tables
- [ ] 4.3 - Build backend API routes (GET/PUT venue content)
- [ ] 4.4 - Design venue details UI/layout
- [ ] 4.5 - Implement 3D → 2D fade transition
- [ ] 4.6 - Build venue information display
- [ ] 4.7 - Add photo gallery component
- [ ] 4.8 - Connect to database
- [ ] 4.9 - Add loading states

**Estimated Time:** 5-6 hours
**Status:** Not Started

---

### **PHASE 5: Admin Interface** ⏳
**Goal:** Enable admin editing of venue content and photos

#### Tasks:
- [ ] 5.1 - Add "Venue" tab to admin dashboard
- [ ] 5.2 - Create venue content edit form
  - [ ] Title, description, address
  - [ ] Directions URL, parking info
  - [ ] Additional details (JSONB)
- [ ] 5.3 - Add venue photo upload interface
  - [ ] Upload multiple photos
  - [ ] Reorder photos (drag & drop)
  - [ ] Edit captions
  - [ ] Delete photos
- [ ] 5.4 - Connect admin UI to API
- [ ] 5.5 - Add save/update confirmation
- [ ] 5.6 - Test admin functionality

**Estimated Time:** 4-5 hours
**Status:** Not Started

---

### **PHASE 6: Polish & Optimization** ⏳
**Goal:** Refine animations, optimize performance, ensure mobile support

#### Tasks:
- [ ] 6.1 - Optimize Three.js geometry (reduce poly count)
- [ ] 6.2 - Implement texture compression
- [ ] 6.3 - Add loading screen/progress bar
- [ ] 6.4 - Test on mobile devices
- [ ] 6.5 - Add mobile-specific optimizations
- [ ] 6.6 - Implement fallback for older browsers
- [ ] 6.7 - Add accessibility features (skip animation button)
- [ ] 6.8 - Fine-tune animation timing and easing
- [ ] 6.9 - Test scroll performance (60fps target)
- [ ] 6.10 - Cross-browser testing (Chrome, Safari, Firefox)
- [ ] 6.11 - Add error handling
- [ ] 6.12 - Optimize bundle size

**Estimated Time:** 6-8 hours
**Status:** Not Started

---

### **PHASE 7: Testing & Deployment** ⏳
**Goal:** Comprehensive testing and production deployment

#### Tasks:
- [ ] 7.1 - Local testing (all browsers)
- [ ] 7.2 - Mobile testing (iOS, Android)
- [ ] 7.3 - Performance profiling
- [ ] 7.4 - Fix bugs and edge cases
- [ ] 7.5 - Create seed data for venue content
- [ ] 7.6 - Run database migration on production
- [ ] 7.7 - Deploy to Render
- [ ] 7.8 - Production testing
- [ ] 7.9 - Monitor performance metrics
- [ ] 7.10 - User acceptance testing

**Estimated Time:** 4-5 hours
**Status:** Not Started

---

## 📦 Technical Stack

### Frontend
- **Three.js** - 3D graphics and animations
- **GSAP ScrollTrigger** - Scroll-based animation control
- **Vanilla JS** - Core functionality
- **CSS** - 2D styling for venue details section

### Backend
- **Node.js/Express** - API routes
- **PostgreSQL** - Venue content storage
- **Multer** - Photo uploads

### Assets
- **Custom 3D Models** - SF skyline geometry
- **Textures** - SF map, materials
- **Images** - Venue photos (user-uploaded)

---

## 🎨 Design Specifications

### Color Palette
- Skyline: Elegant silhouette (dark against gradient sky)
- Map: Stylized, wedding theme colors (blues, lavenders from existing theme)
- Markers: Highlight color for Officers Club
- Background: Gradient transitions

### Typography
- Venue title: Existing heading styles
- Details: Body text from theme
- Maintain consistent brand

### Animation Timing
- **Phase 1 (Skyline → Map):** 30-40% of scroll range
- **Phase 2 (Map Zoom):** 30-40% of scroll range
- **Phase 3 (Fade to Details):** 20-30% of scroll range
- **Total:** Smooth, deliberate pace (not too fast)

---

## 📊 Performance Targets

| Metric | Target | Critical |
|--------|--------|----------|
| FPS (Desktop) | 60fps | 45fps+ |
| FPS (Mobile) | 60fps | 30fps+ |
| Initial Load | <3s | <5s |
| Bundle Size | <500KB | <1MB |
| Lighthouse Performance | >90 | >70 |

---

## 🚨 Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Mobile performance | High | Reduce geometry, texture quality on mobile |
| Complex scroll behavior | Medium | Thorough testing, simple fallback |
| Large bundle size | Medium | Code splitting, lazy loading |
| Browser compatibility | Medium | Fallback to simple map/images |
| Timeline overrun | Low | Phased approach, MVP first |

---

## 📝 Notes & Decisions

### November 30, 2025
- ✅ Project plan created
- ✅ User confirmed go-ahead for full implementation
- 📝 Decision: Using GSAP ScrollTrigger (already loaded)
- 📝 Decision: Build in phases, test frequently
- 📝 Venue: Officers Club, Presidio, San Francisco

### Key Decisions To Make:
- [ ] Skyline style: Realistic vs. minimalist silhouette?
- [ ] Map style: Illustrated vs. satellite vs. abstract?
- [ ] Lighting: Daytime vs. sunset vs. night?
- [ ] Mobile experience: Full 3D vs. simplified version?

---

## 🎯 Current Sprint

**Active Phase:** Not Started
**Current Task:** None
**Next Up:** Phase 1.1 - Install and configure Three.js

---

## ✅ Completed Tasks

_(None yet - let's get started!)_

---

## 📚 Resources & References

- [Three.js Documentation](https://threejs.org/docs/)
- [GSAP ScrollTrigger](https://greensock.com/scrolltrigger/)
- [Officers Club, Presidio SF](https://www.presidio.gov/officers-club)
- SF Skyline reference images (to be collected)
- SF Map data (to be sourced)

---

## 🏁 Definition of Done

This feature is complete when:
- ✅ All three phases transition smoothly on scroll
- ✅ Experience works on desktop and mobile
- ✅ 60fps performance on modern devices
- ✅ Admin can edit venue content and upload photos
- ✅ Deployed to production
- ✅ User acceptance testing passed
- ✅ No critical bugs

---

**Last Updated:** November 30, 2025
**Progress:** 0% Complete (0/7 phases)
