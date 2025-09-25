// Add this line to the very top of your script.js file
console.log('Script is running!');

// This function fetches the link_token from your backend.
async function getLinkToken() {
    const response = await fetch('https://plaid-sb.onrender.com/create_link_token', {
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
            await fetch('https://plaid-sb.onrender.com/exchange_public_token', {
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


document.getElementById('transactionForm').addEventListener('submit', async function(event) {
    event.preventDefault(); // Prevent default form submission

    const resultsDiv = document.getElementById('results');
    const submitButton = document.getElementById('submitButton');

    // 1. Collect Input Data
    const accessToken = document.getElementById('accessToken').value.trim();
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;

    if (!accessToken || !startDate || !endDate) {
        resultsDiv.innerHTML = '<p class="error">Please fill in all fields.</p>';
        return;
    }

    // Prepare UI for loading state
    resultsDiv.innerHTML = '<p>Fetching transactions... please wait.</p>';
    submitButton.disabled = true;

    // 2. Prepare Payload for Python backend
    const payload = {
        accessToken: accessToken,
        startDate: startDate,
        endDate: endDate
    };

    // 3. Send POST request to your Python backend
    try {
        const response = await fetch('https://plaid-sb.onrender.com/get_transactions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        const data = await response.json();

        // 4. Handle Response
        if (response.ok && data.success) {
            // Success: Display formatted transactions
            resultsDiv.innerHTML = `<p class="success">✅ Successfully retrieved ${data.total_count} transactions.</p>`;
            resultsDiv.innerHTML += '<h3>Transaction List:</h3>';

            // Format transactions for display
            let transactionHtml = '<ul>';
            data.transactions.forEach(t => {
                const amount = t.amount.toFixed(2);
                transactionHtml += `
                    <li>
                        <strong>${t.date}</strong>: ${t.name} ($${amount}) - ${t.transaction_type}
                    </li>`;
            });
            transactionHtml += '</ul>';
            resultsDiv.innerHTML += transactionHtml;

        } else {
            // API Error (e.g., Plaid credentials failed)
            const errorMsg = data.error || 'Unknown error occurred.';
            resultsDiv.innerHTML = `<p class="error">❌ Error: ${errorMsg}</p>`;
        }

    } catch (error) {
        // Network or fetch error (e.g., Python server is not running)
        resultsDiv.innerHTML = `<p class="error">❌ Network Error: Could not connect to the Python server. Make sure main.py is running on port 8000.</p>`;
        console.error('Fetch error:', error);
    } finally {
        submitButton.disabled = false;
    }
});