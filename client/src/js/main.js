// CACHE BUST: Fixed querySelector error - v20241220
console.log('Main.js loaded successfully - cache busted');
// Simple Venue Showcase Animation
function initVenueShowcase() {
    // Register ScrollTrigger plugin
    gsap.registerPlugin(ScrollTrigger);
    
    // Get elements
    const skylinePhase = document.querySelector('.skyline-phase');
    const mapPhase = document.querySelector('.map-phase');
    const venuePhase = document.querySelector('.venue-phase');
    
    if (!skylinePhase || !mapPhase || !venuePhase) {
        console.error('Missing required elements');
        return;
    }
    
    console.log('Initializing simple venue showcase...');
    
    // Set initial states
    gsap.set(skylinePhase, { opacity: 1 });
    gsap.set(mapPhase, { opacity: 0 });
    gsap.set(venuePhase, { opacity: 0 });
    
    // Simple fade transitions with sticky positioning
    ScrollTrigger.create({
        trigger: '.venue-showcase',
        start: 'top top',
        end: '+=200%',
        scrub: 1,
        onUpdate: (self) => {
            const progress = self.progress;
            
            if (progress < 0.33) {
                // First third: fade from skyline to map
                const fadeProgress = progress / 0.33;
                gsap.set(skylinePhase, { opacity: 1 - fadeProgress });
                gsap.set(mapPhase, { opacity: fadeProgress });
                gsap.set(venuePhase, { opacity: 0 });
            } else if (progress < 0.66) {
                // Second third: show map
                gsap.set(skylinePhase, { opacity: 0 });
                gsap.set(mapPhase, { opacity: 1 });
                gsap.set(venuePhase, { opacity: 0 });
            } else {
                // Final third: fade from map to venue
                const fadeProgress = (progress - 0.66) / 0.34;
                gsap.set(skylinePhase, { opacity: 0 });
                gsap.set(mapPhase, { opacity: 1 - fadeProgress });
                gsap.set(venuePhase, { opacity: fadeProgress });
            }
        }
    });
    
    console.log('Simple animation created successfully');
    
    // Add pulsing marker for Presidio location
    const presidioMarker = document.querySelector('circle[cx="250"]');
    if (presidioMarker) {
        gsap.to(presidioMarker, {
            scale: 1.2,
            opacity: 0.8,
            duration: 0.5,
            repeat: -1,
            yoyo: true,
            ease: "power2.inOut"
        });
    }
}

// Navigation functionality
document.addEventListener('DOMContentLoaded', function() {
    // Get all navigation links
    const navLinks = document.querySelectorAll('[data-page]');
    const pages = document.querySelectorAll('.page');
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');

    // Function to show a specific page
    function showPage(pageId) {
        // Hide all pages
        pages.forEach(page => {
            page.classList.remove('active');
        });
        
        // Show the selected page
        const targetPage = document.getElementById(pageId);
        if (targetPage) {
            targetPage.classList.add('active');
            
            // Remove all page classes from body
            document.body.classList.remove('home-page', 'rsvp-page', 'events-page', 'location-page', 'photos-page', 'accommodations-page');
            
            // Add the appropriate page class to body for navbar color control
            document.body.classList.add(`${pageId}-page`);
            
            // Initialize venue showcase if location page is shown
            if (pageId === 'location') {
                // Small delay to ensure DOM is ready
                setTimeout(() => {
                    initVenueShowcase();
                }, 100);
            }
        }
        
        // Close mobile menu if open
        mobileMenu.classList.add('hidden');
        
        // Update URL without page reload
        history.pushState({ page: pageId }, '', `#${pageId}`);
    }

    // Make showPage available globally for authentication system
    window.showPage = showPage;

    // Add click event listeners to navigation links
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const pageId = this.getAttribute('data-page');
            showPage(pageId);
        });
    });

    // Mobile menu toggle
    mobileMenuButton.addEventListener('click', function() {
        mobileMenu.classList.toggle('hidden');
    });

    // Handle browser back/forward buttons
    window.addEventListener('popstate', function(e) {
        const pageId = e.state ? e.state.page : 'home';
        showPage(pageId);
    });

    // Handle initial page load with hash
    const hash = window.location.hash.substring(1);
    if (hash && document.getElementById(hash)) {
        showPage(hash);
    } else {
        showPage('home');
    }

    // RSVP Form handling
    const rsvpForm = document.getElementById('rsvp-form');
    if (rsvpForm) {
        rsvpForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Get form data
            const formData = new FormData(rsvpForm);
            const rsvpData = {
                name: formData.get('name'),
                email: formData.get('email'),
                guests: formData.get('guests'),
                attending: formData.get('attending'),
                dietary: formData.get('dietary')
            };

            // Validate required fields
            if (!rsvpData.name || !rsvpData.email || !rsvpData.guests || !rsvpData.attending) {
                alert('Please fill in all required fields.');
                return;
            }

            // Here you would typically send the data to your server
            // For now, we'll just show a success message
            alert('Thank you for your RSVP! We look forward to celebrating with you.');
            
            // Reset form
            rsvpForm.reset();
        });
    }

    // Note: Smooth scrolling for anchor links removed since navigation uses SPA routing
    // Cache bust: Fixed querySelector error on line 168

    // Add some interactive effects
    // Add hover effects to cards
    const cards = document.querySelectorAll('.bg-white.rounded-lg.shadow-lg');
    cards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-2px)';
            this.style.transition = 'transform 0.3s ease';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
    });

    // Add loading animation for form submissions
    const submitButtons = document.querySelectorAll('button[type="submit"]');
    submitButtons.forEach(button => {
        button.addEventListener('click', function() {
            const originalText = this.textContent;
            this.textContent = 'Submitting...';
            this.disabled = true;
            
            // Re-enable after 2 seconds (in case of error)
            setTimeout(() => {
                this.textContent = originalText;
                this.disabled = false;
            }, 2000);
        });
    });

    // Add fade-in animation for pages
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    // Observe all page content
    pages.forEach(page => {
        page.style.opacity = '0';
        page.style.transform = 'translateY(20px)';
        page.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        observer.observe(page);
    });

    // Show the home page immediately
    const homePage = document.getElementById('home');
    if (homePage) {
        homePage.style.opacity = '1';
        homePage.style.transform = 'translateY(0)';
    }
});

// Utility functions
function formatDate(date) {
    return new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    }).format(date);
}

function formatTime(time) {
    return new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    }).format(time);
}

// Add some dynamic content updates
function updateCountdown() {
    const weddingDate = new Date('2024-06-15T16:00:00');
    const now = new Date();
    const timeDiff = weddingDate - now;
    
    if (timeDiff > 0) {
        const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
        
        // Update countdown if element exists
        const countdownElement = document.getElementById('countdown');
        if (countdownElement) {
            countdownElement.innerHTML = `${days} days, ${hours} hours, ${minutes} minutes`;
        }
    }
}

// Update countdown every minute
setInterval(updateCountdown, 60000);
updateCountdown(); // Initial call
