document.addEventListener('DOMContentLoaded', () => {
    const restaurantContainer = document.getElementById('restaurant-container');
    const searchBar = document.getElementById('search-bar');
    const ratingModal = document.getElementById('rating-modal');
    const addRestaurantModal = document.getElementById('add-restaurant-modal');
    const submitRatingButton = document.getElementById('submit-rating');
    const submitNewRatingButton = document.getElementById('submit-new-rating');

    // Initialize modals
    const modal = M.Modal.init(ratingModal);
    const addModal = M.Modal.init(addRestaurantModal);

    // Initialize select elements
    const elems = document.querySelectorAll('select');
    const instances = M.FormSelect.init(elems);

    // Variable to hold the name of the restaurant being rated
    let currentRestaurantName = '';
    let restaurants = []; // Initialize an empty array for restaurants

    // Function to display restaurants
    function displayRestaurants(data) {
        restaurantContainer.innerHTML = '';
        data.forEach((restaurant) => {
            const restaurantCard = `
                <div class="col s12 m6 l4">
                    <div class="card">
                        <div class="card-content">
                            <span class="card-title">${restaurant.name}</span>
                            <p>Allergy Rating: ${'★'.repeat(restaurant.rating)}${'☆'.repeat(5 - restaurant.rating)}</p>
                        </div>
                        <div class="card-action">
                            <button class="btn" onclick="openRatingModal('${restaurant.name}')">Rate</button>
                        </div>
                    </div>
                </div>
            `;
            restaurantContainer.insertAdjacentHTML('beforeend', restaurantCard);
        });
    }

    // Fetch restaurant data from the server
    function fetchRestaurants() {
        fetch('/get_restaurants') // Replace with the correct URL
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                restaurants = data; // Store the fetched data in the restaurants array
                displayRestaurants(restaurants); // Display the fetched restaurants
            })
            .catch(error => {
                console.error('Error fetching restaurant data:', error);
            });
    }

    // Function to open the rating modal
    window.openRatingModal = function(name) {
        const starRating = document.getElementById('star-rating');
        const comment = document.getElementById('comment');
        starRating.selectedIndex = 0; // Reset star rating
        comment.value = ''; // Reset comment
        currentRestaurantName = name; // Store the current restaurant name
        modal.open(); // Open the modal
    };

    // Function to handle rating submission
    submitRatingButton.addEventListener('click', async () => {
        const starRating = document.getElementById('star-rating').value;
        const comment = document.getElementById('comment').value;
    
        // Data to send to the server
        const ratingData = {
            restaurant_name: currentRestaurantName,
            rating: starRating,
            comment: comment
        };
    
        // Send the data to the Flask server via POST
        try {
            const response = await fetch('/submit_rating', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(ratingData)
            });
    
            if (response.ok) {
                console.log('Rating submitted successfully');
                modal.close(); // Close the modal
    
                // Refresh the restaurant list to show updated ratings
                initialize();  // Call your function that fetches and displays restaurants
            } else {
                console.error('Failed to submit rating');
            }
        } catch (error) {
            console.error('Error submitting rating:', error);
        }
    });
    
    // Function to handle new restaurant submission
    submitNewRatingButton.addEventListener('click', () => {
        const newRestaurantName = document.getElementById('new-restaurant-name').value;
        const newStarRating = document.getElementById('new-star-rating').value;
        const newComment = document.getElementById('new-comment').value;
    
        // Prepare data to send
        const newRestaurantData = {
            name: newRestaurantName,
            rating: parseInt(newStarRating),  // Convert rating to an integer
            comment: newComment
        };
    
        // Send data to the backend
        fetch('/add_restaurant', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(newRestaurantData),
        })
        .then(response => response.json())
        .then(data => {
            console.log('Restaurant added:', data);
            addModal.close(); // Close the modal
        })
        .catch(error => {
            console.error('Error:', error);
        });
    });
    
    // Add event listener to the sticky button
    const addRestaurantButton = document.getElementById('add-restaurant-button');
    addRestaurantButton.addEventListener('click', () => {
        // Reset new restaurant modal fields
        document.getElementById('new-restaurant-name').value = '';
        document.getElementById('new-star-rating').selectedIndex = 0;
        document.getElementById('new-comment').value = '';

        addModal.open(); // Open the add restaurant modal
    });

    // Function to handle search functionality
    searchBar.addEventListener('input', () => {
        const searchTerm = searchBar.value.toLowerCase(); // Get search term
        const filteredRestaurants = restaurants.filter(restaurant =>
            restaurant.name.toLowerCase().includes(searchTerm) // Filter by name
        );
        displayRestaurants(filteredRestaurants); // Display filtered results
    });

    // Fetch the restaurant data initially
    fetchRestaurants();
});
