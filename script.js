document.addEventListener('DOMContentLoaded', async () => { // Make the callback async
    // --- DOM Elements ---
    const loginBtn = document.getElementById('loginBtn');
    const signupBtn = document.getElementById('signupBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const loggedInUserDisplay = document.getElementById('loggedInUser');
    const loginModal = document.getElementById('loginModal');
    const signupModal = document.getElementById('signupModal');
    const heroSignupBtn = document.getElementById('heroSignupBtn');
    const paymentModal = document.getElementById('paymentModal');
    const completePaymentBtn = document.getElementById('completePaymentBtn');
    const postRideBtn = document.getElementById('postRideBtn');
    const publishRideBtn = document.getElementById('publishRideBtn');
    const postRideModal = document.getElementById('postRideModal');
    const publishRideModal = document.getElementById('publishRideModal');
    const closeButtons = document.querySelectorAll('.close-button');
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const postRideForm = document.getElementById('postRideForm');
    const publishRideForm = document.getElementById('publishRideForm');
    const paymentAmountDisplay = document.getElementById('paymentAmount');
    const ridesContainer = document.getElementById('ridesContainer');
    const indianLocationsList = document.getElementById('indianLocationsList');
    const filterType = document.getElementById('filterType');
    const filterGender = document.getElementById('filterGender');
    const searchLocation = document.getElementById('searchLocation');
    const sortRides = document.getElementById('sortRides');
    const postPickUpInput = document.getElementById('postPickUp');
    const postDropOffInput = document.getElementById('postDropOff');
    const publishPickUpInput = document.getElementById('publishPickUp');
    const publishDropOffInput = document.getElementById('publishDropOff');

    // --- Data ---
    const indianLocations = [
        { state: "Andhra Pradesh", cities: ["Visakhapatnam", "Vijayawada", "Guntur", "Nellore", "Kakinada", "Tirupati"] },
        { state: "Arunachal Pradesh", cities: ["Itanagar", "Naharlagun", "Pasighat", "Tawang"] },
        { state: "Assam", cities: ["Guwahati", "Silchar", "Dibrugarh", "Nagaon", "Tezpur"] },
        { state: "Bihar", cities: ["Patna", "Gaya", "Bhagalpur", "Muzaffarpur", "Purnea"] },
        { state: "Chhattisgarh", cities: ["Raipur", "Bhilai", "Bilaspur", "Korba", "Durg"] },
        { state: "Goa", cities: ["Panaji", "Margao", "Vasco da Gama", "Mapusa"] },
        { state: "Gujarat", cities: ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Bhavnagar"] },
        { state: "Haryana", cities: ["Faridabad", "Gurgaon", "Panipat", "Ambala", "Yamunanagar"] },
        { state: "Himachal Pradesh", cities: ["Shimla", "Mandi", "Solan", "Dharamshala", "Kullu"] },
        { state: "Jharkhand", cities: ["Ranchi", "Jamshedpur", "Dhanbad", "Bokaro", "Deoghar"] },
        { state: "Karnataka", cities: ["Bangalore", "Mysore", "Hubli", "Mangalore", "Belgaum"] },
        { state: "Kerala", cities: ["Thiruvananthapuram", "Kochi", "Kozhikode", "Thrissur", "Kollam"] },
        { state: "Madhya Pradesh", cities: ["Indore", "Bhopal", "Jabalpur", "Gwalior", "Ujjain"] },
        { state: "Maharashtra", cities: ["Mumbai", "Pune", "Nagpur", "Thane", "Nashik", "Aurangabad", "Solapur"] },
        { state: "Manipur", cities: ["Imphal", "Thoubal", "Bishnupur", "Ukhrul"] },
        { state: "Meghalaya", cities: ["Shillong", "Tura", "Jowai"] },
        { state: "Mizoram", cities: ["Aizawl", "Lunglei", "Champhai"] },
        { state: "Nagaland", cities: ["Kohima", "Dimapur", "Mokokchung"] },
        { state: "Odisha", cities: ["Bhubaneswar", "Cuttack", "Rourkela", "Berhampur", "Sambalpur"] },
        { state: "Punjab", cities: ["Ludhiana", "Amritsar", "Jalandhar", "Patiala", "Bathinda"] },
        { state: "Rajasthan", cities: ["Jaipur", "Jodhpur", "Udaipur", "Ajmer", "Kota", "Bikaner"] },
        { state: "Sikkim", cities: ["Gangtok", "Namchi", "Mangan", "Gyalshing"] },
        { state: "Tamil Nadu", cities: ["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem"] },
        { state: "Telangana", cities: ["Hyderabad", "Warangal", "Nizamabad", "Karimnagar", "Khammam"] },
        { state: "Tripura", cities: ["Agartala", "Udaipur", "Dharmanagar"] },
        { state: "Uttar Pradesh", cities: ["Lucknow", "Kanpur", "Agra", "Varanasi", "Meerut", "Allahabad", "Ghaziabad", "Noida"] },
        { state: "Uttarakhand", cities: ["Dehradun", "Haridwar", "Roorkee", "Haldwani", "Rishikesh"] },
        { state: "West Bengal", cities: ["Kolkata", "Asansol", "Siliguri", "Durgapur", "Burdwan"] }
    ];
    let rides = [];
    let loggedInUser = null;
    let shownContacts = {};
    const socket = io('http://127.0.0.1:4000');

    socket.on('connect', () => {
        console.log("Connected to WebSocket Server");
    });

    socket.on('disconnect', () => {
        console.log("Disconnected from WebSocket Server");
    });


    socket.on('rides_updated', (data) => {
        rides = data.rides;
        renderRides();
        logAction("Updated rides from WebSocket.");
    });

    // --- Helper Functions ---
    // Update login state of UI
    async function updateLoginState() {
        if (loggedInUser) {
            try {
                const response = await fetch(`http://127.0.0.1:4000/user/${loggedInUser.id}`);
                if (!response.ok) {
                    alert(`Failed to fetch user details: HTTP error! status: ${response.status}`)
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const userDetails = await response.json();
                loggedInUser = { ...loggedInUser, ...userDetails };
                loggedInUserDisplay.textContent = `Welcome, ${loggedInUser.name}`;
                logoutBtn.style.display = 'inline-block';
                signupBtn.style.display = 'none';
                loginBtn.style.display = 'none';
                postRideBtn.disabled = false;
                publishRideBtn.disabled = false;
            } catch (error) {
                console.error("Failed to fetch user details:", error);
                alert(`Failed to fetch user details: ${error.message}`)
            }

        } else {
            loggedInUserDisplay.textContent = '';
            logoutBtn.style.display = 'none';
            signupBtn.style.display = 'inline-block';
            loginBtn.style.display = 'inline-block';
            postRideBtn.disabled = true;
            publishRideBtn.disabled = true;
        }
    }
    await updateLoginState(); // Initial login state

    // Log actions
    function logAction(message) {
        console.log(`[${new Date().toLocaleTimeString()}] ${message}`);
    }

    // Load rides from server
    async function loadRides() {
        try {
            const response = await fetch('http://127.0.0.1:4000/rides');
            if (!response.ok) {
                alert(`Failed to load rides: HTTP error! status: ${response.status}`)
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            rides = await response.json();
            await loadShownContacts();
            renderRides();
            logAction("Loaded saved rides from database");
        } catch (error) {
            console.error("Failed to load rides:", error);
            alert(`Failed to load rides: ${error.message}`)
        }
    }
    loadRides();

    // Function to load shown contacts from the server
    async function loadShownContacts() {
        try {
            const response = await fetch('http://127.0.0.1:4000/shown-contacts');
            if (!response.ok) {
                alert(`Failed to load shown contacts: HTTP error! status: ${response.status}`)
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const contacts = await response.json();
            shownContacts = contacts.reduce((acc, curr) => {
                acc[curr.ride_id] = curr.show_contact;
                return acc;
            }, {});
        } catch (error) {
            console.error("Failed to load shown contacts:", error);
            alert(`Failed to load shown contacts: ${error.message}`)
        }
    }

    // Function to populate datalist based on user input
    function populateLocations(inputElement) {
        const input = inputElement.value.toLowerCase();
        indianLocationsList.innerHTML = '';

        indianLocations.forEach(location => {
            const state = location.state.toLowerCase();
            location.cities.forEach(city => {
                const cityLower = city.toLowerCase();
                if (cityLower.startsWith(input) || state.startsWith(input)) {
                    const option = document.createElement('option');
                    option.value = `${location.state}, ${city}`;
                    indianLocationsList.appendChild(option);
                }
            });

        });
    }

    // Add event listener to pickup and dropoff
    postPickUpInput.addEventListener('input', function () {
        populateLocations(this);
    });
    postDropOffInput.addEventListener('input', function () {
        populateLocations(this);
    });
    publishPickUpInput.addEventListener('input', function () {
        populateLocations(this);
    });
    publishDropOffInput.addEventListener('input', function () {
        populateLocations(this);
    });
    // Generate initials from name
    function generateInitials(name) {
        if (!name) return '';
        const names = name.split(' ');
        let initials = '';
        for (let i = 0; i < Math.min(2, names.length); i++) {
            initials += names[i][0].toUpperCase();
        }
        return initials;
    }
    // Function to filter rides based on multiple criteria
    function filterRides(ride) {
        const filterTypeValue = filterType.value;
        const filterGenderValue = filterGender.value;
        const searchLocationValue = searchLocation.value.toLowerCase();

        const locationMatch = (searchLocationValue === '' ||
            ride.pickUp.toLowerCase().includes(searchLocationValue) ||
            ride.dropOff.toLowerCase().includes(searchLocationValue)
        );
        const typeMatch = (filterTypeValue === 'all' || ride.type === filterTypeValue);
        const genderMatch = (filterGenderValue === 'all' || ride.gender === filterGenderValue);

        return locationMatch && typeMatch && genderMatch;
    }
    function sortRidesByPrice(ridesToSort) {
        // Example sorting by price. Adjust based on your needs.
        const sortValue = sortRides.value;
        if (sortValue === 'price_asc') {
            return [...ridesToSort].sort((a, b) => (a.price || 0) - (b.price || 0));
        } else if (sortValue === 'price_desc') {
            return [...ridesToSort].sort((a, b) => (b.price || 0) - (a.price || 0));
        } else {
            return ridesToSort;
        }
    }
    // Function to handle OTP verification and display contact
    async function verifyOTPAndShowContact(ride, index, contactDiv) {
        const otp = prompt("Please enter the OTP sent to your mobile number:");
        if (otp && otp === '1234') {
            shownContacts[ride.id] = 1;
            try {
                const response = await fetch('http://127.0.0.1:4000/shown-contacts', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        ride_id: ride.id,
                        show_contact: true
                    }),
                });
                if (!response.ok) {
                    alert(`Failed to update contact: HTTP error! status: ${response.status}`)
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                contactDiv.innerHTML = `<a href="tel:${ride.contact}" class="call-button-link"><i class="fas fa-phone icon"></i> ${ride.contact}</a>`;
            } catch (error) {
                console.error("Failed to update contact:", error);
                alert(`Failed to update contact: ${error.message}`)
            }
        } else {
            alert("Invalid OTP. Please try again.");
        }
    }
    // Function to handle booking ride
    async function handleBookRide(ride, card) {
        try {
            console.log("Booking ride with payload:", { rideId: ride.id, user_id: loggedInUser.id });
             console.log("Ride Object: ", ride)
            const response = await fetch(`http://127.0.0.1:4000/rides/${ride.id}/book`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_id: loggedInUser.id
                })
            });
            if (!response.ok) {
                if (response.status === 400) {
                    alert(`Ride is full!`);
                    card.classList.add('ride-full')
                    const bookButton = card.querySelector('.book-button');
                    if (bookButton) bookButton.disabled = true;
                } else {
                    alert(`Failed to book ride: HTTP error! status: ${response.status}`)
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

            } else {
                alert("Ride Booked Successfully");
                card.classList.add('ride-full')
                const bookButton = card.querySelector('.book-button');
                if (bookButton) bookButton.disabled = true;

                logAction(`Booked ride ${ride.id}`)
            }
        }
        catch (error) {
            console.error("Failed to book ride:", error);
            alert(`Failed to book ride: ${error.message}`)
        }
    }
    async function fetchReviews(rideId) {
        try {
            const response = await fetch(`http://127.0.0.1:4000/rides/${rideId}/reviews`);
            if (!response.ok) {
                alert(`Failed to fetch reviews: HTTP error! status: ${response.status}`)
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error("Failed to fetch reviews:", error);
            alert(`Failed to fetch reviews: ${error.message}`)
        }
        return null
    }
    function showRatingModal(ride) {
        const modal = document.createElement('div');
        modal.classList.add('modal');
        modal.innerHTML = `
                 <div class="modal-content">
                     <span class="close-button">×</span>
                     <h2>Rate Ride</h2>
                     <form id="ratingForm">
                        <input type="hidden" id="ratingRideId" value="${ride.id}"/>
                        <input type="number" id="ratingUserId" placeholder="User Id" required/>
                        <label for="ratingValue">Rating:</label>
                        <select id="ratingValue" title="Select your rating for this ride">
                             <option value="1">1 Star</option>
                            <option value="2">2 Star</option>
                            <option value="3">3 Star</option>
                            <option value="4">4 Star</option>
                             <option value="5">5 Star</option>
                         </select>
                        <button type="submit">Rate</button>
                     </form>
                 </div>
             `;
        document.body.appendChild(modal);
        modal.querySelector('.close-button').addEventListener('click', () => {
            modal.remove();
        });
        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                modal.remove();
            }
        });
        modal.querySelector('#ratingForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const ride_id = document.getElementById('ratingRideId').value;
            const user_id = document.getElementById('ratingUserId').value;
            const rating = document.getElementById('ratingValue').value;
            try {
                const response = await fetch(`http://127.0.0.1:4000/rides/${ride_id}/ratings`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        user_id: user_id,
                        rating: rating,
                    }),
                });
                if (!response.ok) {
                    alert(`Failed to submit rating: HTTP error! status: ${response.status}`)
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                modal.remove();
                logAction(`Rated ride ${ride.id}`)
            } catch (error) {
                console.error("Failed to submit rating:", error);
                alert(`Failed to submit rating. Please try again.`);
            }
        });
    }
    function showReviewModal(ride) {
        const modal = document.createElement('div');
        modal.classList.add('modal');
        modal.innerHTML = `
               <div class="modal-content">
                  <span class="close-button">×</span>
                   <h2>Add Review</h2>
                   <form id="reviewForm">
                       <input type="hidden" id="reviewRideId" value="${ride.id}"/>
                       <input type="number" id="reviewUserId" placeholder="User Id" required/>
                       <textarea id="reviewComment" placeholder="Write your review..." required></textarea>
                       <button type="submit">Post Review</button>
                   </form>
               </div>
           `;
        document.body.appendChild(modal);
        modal.querySelector('.close-button').addEventListener('click', () => {
            modal.remove();
        });
        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                modal.remove();
            }
        });
        modal.querySelector('#reviewForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const ride_id = document.getElementById('reviewRideId').value;
            const user_id = document.getElementById('reviewUserId').value;
            const comment = document.getElementById('reviewComment').value;
            try {
                const response = await fetch(`http://127.0.0.1:4000/rides/${ride_id}/reviews`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        user_id: user_id,
                        comment: comment,
                    }),
                });
                if (!response.ok) {
                    alert(`Failed to submit review: HTTP error! status: ${response.status}`)
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                modal.remove();
                logAction(`Reviewed ride ${ride.id}`)
            } catch (error) {
                console.error("Failed to submit review:", error);
                alert(`Failed to submit review. Please try again.`);
            }
        });
    }
    async function handleCancelRide(ride, card) {
        try {
            const response = await fetch(`http://127.0.0.1:4000/rides/${ride.id}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            if (!response.ok) {
                alert(`Failed to delete ride: HTTP error! status: ${response.status}`)
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            card.remove()
            logAction(`Cancelled ride ${ride.id}`)
        } catch (error) {
            console.error("Failed to cancel ride:", error);
            alert(`Failed to cancel ride: ${error.message}`)
        }
    }

    // Render ride cards
    function renderRides() {
        ridesContainer.innerHTML = '';
        const filteredAndSortedRides = sortRidesByPrice(rides.filter(filterRides));
        filteredAndSortedRides.forEach(async (ride, index) => {
            const card = document.createElement('div');
            card.classList.add('ride-card');
            if (ride.is_full) {
                card.classList.add('ride-full')
            }
            const initials = generateInitials(ride.userName);
            card.innerHTML = `
                       <div class="profile-container">
                           <div class="profile-circle">${initials}</div>
                            <span>${ride.userName}</span>
                       </div>
                       <h3><i class="fas fa-car icon"></i>${ride.type === 'post' ? 'Posting' : 'Publishing'} Ride</h3>
                      <p><i class="fas fa-map-marker-alt icon"></i> <strong>Pick-up:</strong> ${ride.pickUp}</p>
                       <p><i class="fas fa-map-marker-alt icon"></i> <strong>Drop-off:</strong> ${ride.dropOff}</p>
                      <p><i class="fas fa-venus-mars icon"></i> <strong>Gender:</strong> ${ride.gender}</p>
                       <p><i class="fas fa-chair icon"></i> <strong>Seats:</strong> ${ride.seats}</p>
                      <p><i class="fas fa-users icon"></i> <strong>Persons:</strong> ${ride.persons}</p>
                     <p><i class="fas fa-car icon"></i> <strong>Car Type:</strong> ${ride.carType}</p>
                  `;

            const contactDiv = document.createElement('div');
            contactDiv.classList.add('call-button');
           let contactButtonContent;

            if (!shownContacts[ride.id]) {
                contactButtonContent = '<i class="fas fa-phone icon"></i> Show Contact';
                contactDiv.addEventListener('click', () => {
                    verifyOTPAndShowContact(ride, index, contactDiv);
                });
            } else {
                 contactButtonContent = `<a href="tel:${ride.contact}" class="call-button-link"><i class="fas fa-phone icon"></i> ${ride.contact}</a>`;

            }
            contactDiv.innerHTML = contactButtonContent;
            card.appendChild(contactDiv);
            const bookButton = document.createElement('button');
            bookButton.classList.add('book-button');
            bookButton.innerHTML = '<i class="fas fa-check-circle icon"></i> Book Ride';

            if (ride.is_full) {
                bookButton.disabled = true;
            }
            bookButton.addEventListener('click', async () => {
                await handleBookRide(ride, card);
            });
            card.appendChild(bookButton);
            if (loggedInUser && ride.user_id === loggedInUser.id) {
                const cancelButton = document.createElement('button');
                cancelButton.classList.add('cancel-button');
                cancelButton.innerHTML = '<i class="fas fa-times-circle icon"></i> Cancel Ride';
                cancelButton.addEventListener('click', async () => {
                    if (confirm(`Are you sure you want to cancel this ${ride.type} ride?`)) {
                        await handleCancelRide(ride, card)
                    }

                })
                card.appendChild(cancelButton);
            }
            const ratingButton = document.createElement('button');
            ratingButton.classList.add('rating-button')
            ratingButton.innerHTML = '<i class="fas fa-star icon"></i> Rate Ride';
            ratingButton.addEventListener('click', () => {
                showRatingModal(ride)
            });
            card.appendChild(ratingButton)
            const reviewButton = document.createElement('button');
            reviewButton.classList.add('review-button')
            reviewButton.innerHTML = '<i class="fas fa-comment icon"></i> Add Review';
            reviewButton.addEventListener('click', () => {
                showReviewModal(ride)
            });
            card.appendChild(reviewButton)
            const reviews = await fetchReviews(ride.id)
            if (reviews && reviews.length > 0) {
                const reviewContainer = document.createElement('div');
                reviewContainer.classList.add('review-container');
                reviews.forEach(review => {
                    const p = document.createElement('p');
                    p.innerHTML = `<strong>${review.user_id}</strong>: ${review.comment}`;
                    reviewContainer.appendChild(p)
                })
                card.appendChild(reviewContainer)
            }

            ridesContainer.appendChild(card);
        });
    }

    // --- Event Listeners ---
    // Filter Event Listeners
    filterType.addEventListener('change', renderRides);
    filterGender.addEventListener('change', renderRides);
    searchLocation.addEventListener('input', renderRides);
    sortRides.addEventListener('change', renderRides);

    // Login button click
    loginBtn.addEventListener('click', () => {
        loginModal.style.display = 'block';
        logAction('Opened login modal');
    });

    // Signup button click
    signupBtn.addEventListener('click', () => {
        signupModal.style.display = 'block';
        logAction('Opened signup modal');
    });

    // Hero signup button click
    heroSignupBtn.addEventListener('click', () => {
        signupModal.style.display = 'block';
        logAction('Opened signup modal from hero section');
    });
    // Logout button click
    logoutBtn.addEventListener('click', () => {
        loggedInUser = null;
        shownContacts = {};
        updateLoginState();
        logAction("Logged out");
    });

    // Post ride button click
    postRideBtn.addEventListener('click', () => {
        if (!loggedInUser) {
            alert('Please Login or Signup first');
            return;
        }
        postRideModal.style.display = 'block';
        logAction("Opened post ride modal");
    });

    // Publish ride button click
    publishRideBtn.addEventListener('click', () => {
        if (!loggedInUser) {
            alert('Please Login or Signup first');
            return;
        }
        publishRideModal.style.display = 'block';
        logAction('Opened publish ride modal');
    });
    // Close modal buttons click
    closeButtons.forEach(button => {
        button.addEventListener('click', () => {
            loginModal.style.display = 'none';
            paymentModal.style.display = 'none';
            signupModal.style.display = 'none';
            postRideModal.style.display = 'none';
            publishRideModal.style.display = 'none';
            logAction('Closed modal');
        });
    });
    // Close modals by clicking outside of them
    window.addEventListener('click', (event) => {
        if (event.target === loginModal) {
            loginModal.style.display = 'none';
            logAction('Closed login modal by clicking outside');
        }
        if (event.target === paymentModal) {
            paymentModal.style.display = 'none';
            logAction('Closed payment modal by clicking outside');        }
        if (event.target === signupModal) {
            signupModal.style.display = 'none';
            logAction('Closed signup modal by clicking outside');
        }
        if (event.target === postRideModal) {
            postRideModal.style.display = 'none';
            logAction('Closed post ride modal by clicking outside');
        }
        if (event.target === publishRideModal) {
            publishRideModal.style.display = 'none';
            logAction('Closed publish ride modal by clicking outside');
        }
    });

    // Handle signup form submission
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('signupName').value;
        const email = document.getElementById('signupEmail').value;
        const password = document.getElementById('signupPassword').value;
        const gender = document.getElementById('signupGender').value;

        try {
            const response = await fetch('http://127.0.0.1:4000/signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: name,
                    email: email,
                    password: password,
                    gender: gender,
                }),
            });
            if (!response.ok) {
                if (response.status === 409) {
                    alert('Email address already exists. Please use a different email address.')
                }
                else {
                    alert(`Failed to signup user: HTTP error! status: ${response.status}`)
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const result = await response.json();
            loggedInUser = {
                id: result.id,
                name: name,
                email: email,
                gender: gender
            };
            signupForm.reset();
            await updateLoginState();
            signupModal.style.display = 'none';
            logAction(`Signed up user ${name}`);
            alert('Signup Successful, You are logged in');
        } catch (error) {
            console.error("Failed to signup user:", error);
            alert(`Failed to signup. Please try again.`);
        }
    });
    // Handle login form submission
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        try {
            const response = await fetch('http://127.0.0.1:4000/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: email,
                    password: password,
                }),
            });
            if (!response.ok) {
                if (response.status === 401) {
                    alert("Invalid Credentials");
                }
                else {
                    alert(`Failed to login user: HTTP error! status: ${response.status}`)
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            loggedInUser = await response.json();
            loginForm.reset();
            await updateLoginState();
            loginModal.style.display = 'none';
            logAction(`Logged in user ${email}`);
            alert('Login Successful');
        } catch (error) {
            console.error("Failed to login user:", error);
            alert(`Failed to login. Please try again.`);
        }
    });
    // Common function to handle ride form submission
    async function handleRideFormSubmit(form, type) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const pickUpInput = form.querySelector(`#${type}PickUp`);
            const dropOffInput = form.querySelector(`#${type}DropOff`);
            const pickUp = pickUpInput.value;
            const dropOff = dropOffInput.value;
            const gender = form.querySelector(`#${type}Gender`).value;
            const userName = form.querySelector(`#${type}UserName`).value;
            const seatsInput = form.querySelector(`#${type}Seats`);
            const personsInput = form.querySelector(`#${type}Persons`);
            const carType = form.querySelector(`#${type}CarType`).value;
            const contact = form.querySelector(`#${type}Contact`).value;
            const bags = form.querySelector(`#${type}Bags`)?.value;
            const price = form.querySelector(`#${type}Price`)?.value;
            const bagsAllowed = form.querySelector(`#${type}BagsAllowed`)?.value;
            const petsAllowed = form.querySelector(`#${type}PetsAllowed`)?.value;

            const seats = parseInt(seatsInput.value)
            const persons = parseInt(personsInput.value)

            if (isNaN(seats) || isNaN(persons)) {
                alert('Please enter a valid number of seats and persons');
                return;
            }
            try {
                const response = await fetch('http://127.0.0.1:4000/rides', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        type: type,
                        pickUp: pickUp,
                        dropOff: dropOff,
                        userName: userName,
                        gender: gender,
                        seats: seats,
                        carType: carType,
                        persons: persons,
                        contact: contact,
                        bags: bags,
                        price: price,
                        bagsAllowed: bagsAllowed,
                        petsAllowed: petsAllowed,
                        user_id: loggedInUser ? loggedInUser.id : null,
                        is_full: false,
                    }),
                });
                if (!response.ok) {
                    alert(`Failed to ${type} ride: HTTP error! status: ${response.status}`)
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                form.closest('.modal').style.display = 'none'; //Close modal
                form.reset();
                await loadRides();
                 if (loggedInUser) {
                    alert(`Ride ${type === 'post' ? 'Posted' : 'Published'}, Have a safe journey!`);
                }
                logAction(`${type === 'post' ? 'Posted' : 'Published'} a ride from ${pickUp} to ${dropOff} by ${userName}`);
            } catch (error) {
                console.error(`Failed to ${type} ride:`, error);
                alert(`Failed to ${type} ride. Please try again.`);
            }
        });
    }
    // Handle post ride form submission
    handleRideFormSubmit(postRideForm, 'post');

    // Handle publish ride form submission
    handleRideFormSubmit(publishRideForm, 'publish');
    //add event listener on sorting selection
    sortRides.addEventListener('change', renderRides);
});