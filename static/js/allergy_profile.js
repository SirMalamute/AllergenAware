document.addEventListener('DOMContentLoaded', () => {
    const allergyContainer = document.getElementById('allergy-container');
    const addAllergyButton = document.getElementById('add-allergy');
    const clearInfoButton = document.getElementById('clear-info');

    if (!allergyContainer || !addAllergyButton) {
        console.error("Required elements are not present in the DOM.");
        return; // Exit if required elements are not found
    }

    loadProfile();

    const form = document.getElementById('allergy-form');
    form.addEventListener('submit', function(event) {
        event.preventDefault();
        saveProfile();
    });

    addAllergyButton.addEventListener('click', addAllergy);

    if (clearInfoButton) {
        clearInfoButton.addEventListener('click', clearProfile);
    }

    // Event delegation for removing allergy rows
    allergyContainer.addEventListener('click', function(event) {
        if (event.target.classList.contains('remove-allergy')) {
            console.log('Remove button clicked'); // Debugging log
            const row = event.target.closest('.row');
            if (row && row.id !== 'allergy-1') {
                console.log('Removing row:', row.id); // Debugging log
                row.innerHTML = '';  // Clear the row's inner content
            }
        }
    });

    // Initialize Materialize modal
    const elems = document.querySelectorAll('.modal');
    const instances = M.Modal.init(elems);

    // Add event listener for QR code button
    const getQRCodeButton = document.getElementById('get-qr-code');
    getQRCodeButton.addEventListener('click', openQrCodeModal);
});

// Track number of allergies
let allergyCount = 1;

// Function to add a new allergy input row
function addAllergy() {
    allergyCount++;
    const allergyContainer = document.getElementById('allergy-container');
    const newAllergyHTML = `
        <div class="row" id="allergy-${allergyCount}">
            <div class="col s12 m8">
                <select class="browser-default" name="allergy" required>
                    <option value="" disabled selected>Choose your allergy</option>
                    <option value="Peanuts">Peanuts</option>
                    <option value="Tree Nuts">Tree Nuts</option>
                    <option value="Milk">Milk</option>
                    <option value="Eggs">Eggs</option>
                    <option value="Fish">Fish</option>
                    <option value="Shellfish">Shellfish</option>
                    <option value="Wheat">Wheat</option>
                    <option value="Soy">Soy</option>
                </select>
            </div>
            <div class="col s12 m3">
                <label>Anaphylactic:</label>
                <p>
                    <label>
                        <input name="anaphylactic-${allergyCount}" type="radio" value="yes" required />
                        <span>Yes</span>
                    </label>
                    <label>
                        <input name="anaphylactic-${allergyCount}" type="radio" value="no" required />
                        <span>No</span>
                    </label>
                </p>
            </div>
            <div class="col s12 m1">
                <button type="button" class="remove-allergy btn red">&times;</button>
            </div>
        </div>
    `;
    allergyContainer.insertAdjacentHTML('beforeend', newAllergyHTML);
}

// Function to save profile to local storage
function saveProfile() {
    const allergies = Array.from(document.querySelectorAll('select[name="allergy"]')).map(el => el.value);
    const anaphylacticStatus = Array.from(document.querySelectorAll('input[type="radio"]:checked')).map(el => el.value);

    const profile = { allergies, anaphylacticStatus };
    localStorage.setItem('allergyProfile', JSON.stringify(profile));
    displayProfile(profile);
    location.reload(true); 
}

// Function to load profile on page load
function loadProfile() {
    const profile = JSON.parse(localStorage.getItem('allergyProfile'));
    if (profile) {
        displayProfile(profile);
        document.getElementById('form-container').style.display = 'none'; // Hide form
        document.getElementById('saved-info').style.display = 'block'; // Show saved info
    }
}

// Function to display the saved profile
// Function to display the saved profile
// Function to display the saved profile
function displayProfile(profile) {
    const savedInfoDiv = document.getElementById('saved-info');
    savedInfoDiv.innerHTML = `<h3 class="center-align">Saved Allergy Profile:</h3>`;

    // Create a mapping of allergies to their forum keys
    const allergyMap = {
        'Peanuts': 'peanut',
        'Tree Nuts': 'treenut',
        'Milk': 'milk',
        'Eggs': 'egg',
        'Fish': 'fish',
        'Shellfish': 'shellfish',
        'Wheat': 'wheat',
        'Soy': 'soy'
    };

    // Loop through allergies and display each one as a card
    profile.allergies.forEach((allergy, index) => {
        const anaphylacticStatus = profile.anaphylacticStatus[index] === 'yes' ? 'Anaphylactic' : 'Non-anaphylactic';
        
        // Get the corresponding forum key from the map
        const allergyKey = allergyMap[allergy] || ''; // Default to empty string if not found
        
        savedInfoDiv.innerHTML += `
            <div class="card allergy-card">
                <div class="card-content">
                    <span class="card-title">${allergy}</span>
                    <p class="status ${anaphylacticStatus === 'Anaphylactic' ? 'red-text' : 'green-text'}">
                        ${anaphylacticStatus}
                    </p>
                </div>
                <div class="card-action">
                    <a href="/forum?allergy=${allergyKey}" class="forum-btn btn blue waves-effect waves-light">Forum</a>
                </div>
            </div>
        `;
    });

    // Add the clear button below the cards
    savedInfoDiv.innerHTML += `
        <div class="center-align">
            <button id ="get-qr-code" class="btn blue waves-effect waves">Get QR Code</button>
            <button id="clear-info" class="btn red waves-effect waves-light">Clear Info</button>
        </div>
    `;

    // Attach event listener for clearing the profile
    const clearInfoButton = document.getElementById('clear-info');
    clearInfoButton.addEventListener('click', clearProfile);
}


// Function to clear profile from local storage
function clearProfile() {
    localStorage.removeItem('allergyProfile');
    document.getElementById('saved-info').innerHTML = '';
    document.getElementById('saved-info').style.display = 'none';
    document.getElementById('form-container').style.display = 'block'; // Show form
    document.getElementById('allergy-form').reset();
    allergyCount = 1; // Reset the counter
    document.querySelectorAll('.row').forEach((row, index) => {
        if (index > 0) row.innerHTML = ''; // Clear additional allergy rows
    });
}

// Open QR Code Modal
// Open QR Code Modal and generate URL
// Open QR Code Modal
function openQrCodeModal() {
    const qrModal = document.getElementById('qr-modal');
    const instance = M.Modal.getInstance(qrModal);
    instance.open();

    // Collect allergens and anaphylactic status from local storage
    const profile = JSON.parse(localStorage.getItem('allergyProfile'));
    const allergens = profile.allergies.join(','); // Format allergens as a comma-separated string
    const anaphylactic = profile.anaphylacticStatus.includes('yes') ? 'true' : 'false';

    // Create the URL for the QR code
    const qrURL = `/allergy_info?allergens=${allergens}&anaphylactic=${anaphylactic}`;

    // Send the URL to Flask to generate the QR code
    fetch('/generate_qr', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: qrURL }),  // Send the URL data to Flask
    })
    .then(response => response.json())
    .then(data => {
        // Set the QR code image source dynamically after Flask responds with the file name
        document.getElementById('qr-code-image').src = `/static/qr_codes/${data.file_name}`;
    })
    .catch(error => {
        console.error('Error generating QR code:', error);
    });
    const linkElement = qrModal.querySelector('a');
    linkElement.href = qrURL;
    linkElement.textContent = 'site';
}