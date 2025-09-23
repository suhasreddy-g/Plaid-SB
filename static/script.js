// Add this line to the very top of your script.js file
console.log('Script is running!');

// This function fetches the link_token from your backend.
async function getLinkToken() {
    const response = await fetch('http://127.0.0.1:5000/create_link_token', {
        method: 'POST',
    });
    console.log('Raw response:', response);
    const data = await response.json();
    return data.link_token;
}

// Get the button element from your HTML.
const linkButton = document.getElementById('link-button');

// Add a click event listener to the button.
linkButton.addEventListener('click', async () => {
    const linkToken = await getLinkToken();

    // Initialize Plaid Link with the token from your backend.
    const handler = Plaid.create({
        token: linkToken,
        onSuccess: async (public_token, metadata) => {
            // When the user successfully links their account,
            // exchange the public token with your backend.
            await fetch('http://127.0.0.1:5000/exchange_public_token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ public_token }),
            });
            alert('Account linked successfully!');
        },
        onLoad: () => {
            // Optional: Do something when Plaid Link is loaded.
        },
        onExit: (err, metadata) => {
            // Optional: Handle errors or user exit.
            console.error('Plaid Link exited', err, metadata);
        },
    });

    // Open Plaid Link.
    handler.open();
});