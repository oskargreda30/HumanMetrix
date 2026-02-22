// Array to hold our leads in memory
let leadsList = [];

// Load existing leads from Chrome Storage when popup opens
chrome.storage.local.get(['savedLeads'], function(result) {
    if (result.savedLeads) {
        leadsList = result.savedLeads;
        document.getElementById('count').innerText = leadsList.length;
    }
});

document.addEventListener('DOMContentLoaded', () => {

    // --- 1. SCRAPING LOGIC ---
    document.getElementById('scrapeProfile').addEventListener('click', async () => {
        let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (!tab.url.includes("linkedin.com/in/")) {
            alert("Please navigate to a LinkedIn Profile page first.");
            return;
        }

        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: extractProfileData,
        }, (results) => {
            if (results && results[0] && results[0].result) {
                const data = results[0].result;
                if (data.name) document.getElementById('leadName').value = data.name;
                if (data.company) {
                    document.getElementById('companyName').value = data.company;
                    // Auto-guess domain, user can override it manually
                    const guessedDomain = data.company.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() + '.com';
                    document.getElementById('companyDomain').value = guessedDomain;
                }
            }
        });
    });

    // --- 2. GOOGLE DORK LOGIC ---
    document.getElementById('runDorks').addEventListener('click', () => {
        const name = document.getElementById('leadName').value.trim();
        const company = document.getElementById('companyName').value.trim();
        let domain = document.getElementById('companyDomain').value.trim();

        if (!name || !company) {
            alert("Please scrape a profile or enter a Name and Company first.");
            return;
        }
        
        if (!domain) domain = company.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() + '.com';

        // Expanded Dorks Array
        const dorks = [
            `"${name}" filetype:pdf OR filetype:docx (resume OR CV OR "curriculum vitae")`,
            `"${name}" ("whatsapp" OR "tel" OR "cell" OR "mobile" OR "contact info" OR "contact information" OR "direct dial")`,
            `site:${domain} "${name}" ("phone" OR "contact" OR "email")`,
            `"${name}" ("@${domain}" OR "@gmail.com" OR "@yahoo.com")`,
            `site:zoominfo.com OR site:rocketreach.co OR site:apollo.io "${name}" "${company}"`,
            `site:pastebin.com OR site:controlc.com "${name}" "${company}"`,
            `site:docs.google.com "${company}" "contact list" OR "directory"`,
            `"${name}" "${company}" site:twitter.com OR site:facebook.com`
        ];

        // Open all dorks in a NEW Chrome window to avoid popup blockers
        const urls = dorks.map(dork => `https://www.google.com/search?q=${encodeURIComponent(dork)}`);
        chrome.windows.create({ url: urls, focused: false });
    });

    // --- 3. SAVE DATA LOGIC ---
    document.getElementById('addToList').addEventListener('click', () => {
        const name = document.getElementById('leadName').value.trim();
        const company = document.getElementById('companyName').value.trim();
        const email = document.getElementById('saveEmail').value.trim();
        const phone = document.getElementById('saveNumber').value.trim();

        if (!name) return;

        leadsList.push({ name, email, company, phone });
        
        // Save to Chrome Storage
        chrome.storage.local.set({ 'savedLeads': leadsList }, () => {
            document.getElementById('count').innerText = leadsList.length;
            
            // Clear sub-fields for next lead
            document.getElementById('saveEmail').value = '';
            document.getElementById('saveNumber').value = '';
            
            // Give user visual feedback
            const btn = document.getElementById('addToList');
            btn.innerText = "Saved!";
            setTimeout(() => btn.innerText = "Add Lead to List", 1500);
        });
    });

    // --- 4. CSV DOWNLOAD & CLEAR LOGIC ---
    document.getElementById('downloadCsv').addEventListener('click', () => {
        if (leadsList.length === 0) return;
        let csvContent = "Name,Email,Company,Number\n";
        leadsList.forEach(l => {
            csvContent += `"${l.name}","${l.email}","${l.company}","${l.phone}"\n`;
        });
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        chrome.downloads.download({ url: url, filename: "osint_leads.csv" });
    });

    document.getElementById('clearLeads').addEventListener('click', () => {
        if(confirm("Are you sure you want to clear all saved leads?")) {
            leadsList = [];
            chrome.storage.local.set({ 'savedLeads': leadsList }, () => {
                document.getElementById('count').innerText = 0;
            });
        }
    });
});

// The function that runs inside the LinkedIn page
function extractProfileData() {
    let name = '';
    let company = '';
    
    // ATTEMPT 1: Standard DOM selectors
    let nameObj = document.querySelector('h1');
    let companyObj = document.querySelector('[aria-label^="Current company:"]');
    name = nameObj ? nameObj.innerText.trim() : '';
    company = companyObj ? companyObj.innerText.trim() : '';

    if (!company) {
        let exp = document.querySelector('.pvs-entity span[aria-hidden="true"]');
        if (exp) company = exp.innerText.trim();
    }

    // ATTEMPT 2: Fallback to Page Title (Highly reliable if DOM changes)
    if (!name || !company) {
        let titleParts = document.title.split(' - ');
        // E.g. "Jane Doe - Software Engineer - Acme Corp | LinkedIn"
        if (!name && titleParts.length > 0) {
            name = titleParts[0].trim();
        }
        if (!company && titleParts.length > 2) {
            let compPart = titleParts[2].split(' | ')[0]; 
            company = compPart.trim();
        }
    }

    return { name, company };
}
