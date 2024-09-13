document.addEventListener('gesturestart', function (e) {
    e.preventDefault(); // Prevent pinch to zoom
});

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js')
        .then(registration => {
            console.log('Service Worker registered with scope:', registration.scope);
        })
        .catch(error => {
            console.log('Service Worker registration failed:', error);
        });
}



document.addEventListener("DOMContentLoaded", function () {

    let balance = parseFloat(localStorage.getItem("balance")) || 0;
    let billsIncomeList = JSON.parse(localStorage.getItem("billsIncomeList")) || [];
    let paidOneTimePayments = JSON.parse(localStorage.getItem("billsIncomeList")) || [];
    let modifiedOccurrences = JSON.parse(localStorage.getItem("modifiedOccurrences")) || [];

    // Convert string dates to Date objects
    modifiedOccurrences = modifiedOccurrences.map(item => ({
        ...item,
        date: new Date(item.date)
    }));

    // DOM Elements
    const balanceInput = document.getElementById("balance-input");
    const forecastList = document.getElementById("forecast-list");
    const billsIncomeForm = document.getElementById("bills-income-form");
    const billsIncomeListElement = document.getElementById("bills-list");
    const forecastSection = document.getElementById("forecast");
    const calendarSection = document.getElementById("calendar");
    const billsIncomeSection = document.getElementById("bills-income");
    const accountSection = document.getElementById("account");
    const currentDateElement = document.getElementById("current-date");
    const editIndexInput = document.getElementById("edit-index");
    const historySection = document.getElementById("history");



    // Backup and Restore Elements
    const backupButton = document.getElementById("backup-btn");
    const restoreInput = document.getElementById("restore-input");

    // Tab links
    const forecastLink = document.getElementById("forecast-link");
    const billsIncomeLink = document.getElementById("bills-income-link");
    const historyLink = document.getElementById("history-link");
    const accountLink = document.getElementById("account-link");
    const calendarLink = document.getElementById("calendar-link");

    // Initialize balance
    balanceInput.value = balance.toFixed(2);
    updateForecastList();
    updateBillsIncomeList();

    // Show today's date next to Forecast title
    const today = new Date();
    currentDateElement.textContent = today.toLocaleDateString();

    // Show the default tab on page load
    showSection("forecast");

    // Tab switching
    forecastLink.addEventListener("click", () => showSection("forecast"));
    billsIncomeLink.addEventListener("click", () => showSection("bills-income"));
    historyLink.addEventListener("click", () => showSection("history"));
    accountLink.addEventListener("click", () => showSection("account"));
    calendarLink.addEventListener("click", () => showSection("calendar"));

    // Function to save balance and update the UI
    function saveBalance() {
        balance = parseFloat(balanceInput.value) || 0;
        localStorage.setItem("balance", balance.toFixed(2));
        updateForecastList();
        console.log("Balance saved:", balance.toFixed(2));
    }

    // Update balance when Enter key is pressed
    balanceInput.addEventListener("keypress", function (event) {
        if (event.key === "Enter") {
            event.preventDefault(); // Prevent form submission or any default action
            balanceInput.blur(); // Remove focus from the input field
            saveBalance(); // Save the balance when Enter is pressed
        }
    });

    // Update balance when input loses focus (blur event)
    balanceInput.addEventListener("blur", function () {
        saveBalance(); // Save the balance when the input loses focus
    });

    // Add or update a bill/income
    billsIncomeForm.addEventListener("submit", handleFormSubmit);

    // Handle Backup
    backupButton.addEventListener("click", handleBackup);

    // Handle Restore
    restoreInput.addEventListener("change", handleRestore);

    // Core Functions


    // Get the clear history button
    const clearHistoryBtn = document.getElementById("clear-history-btn");

    // Add event listener to clear history when the button is clicked
    clearHistoryBtn.addEventListener("click", clearHistory);

    function clearHistory() {
        if (confirm("Are you sure you want to clear the history? This action cannot be undone.")) {
            let permanentDelete = JSON.parse(localStorage.getItem("permanentDelete")) || [];

            // Push paid bills' occurrence IDs to the permanentDelete array
            billsIncomeList.forEach(item => {
                if (item.paid && item.paid.length > 0) {
                    permanentDelete.push(...item.paid);  // Add all paid occurrence IDs to permanentDelete
                }
                item.paid = [];  // Clear the paid list for each bill
            });

            // Update localStorage with the permanent delete list
            localStorage.setItem("permanentDelete", JSON.stringify(permanentDelete));

            let oneTimePaymentsBill = []; // Set it to an empty array
            localStorage.setItem("paidOneTimePayments", JSON.stringify(oneTimePaymentsBill)); // Update the localStorage

            // Save the changes
            saveData();

            // Update the history and forecast lists to reflect the changes
            updateHistoryList();
            updateForecastList();

            alert("History has been cleared.");
        }
    }


    // History link functionality is already declared, no need to redeclare it
    historyLink.addEventListener("click", () => {
        showSection("history");
        updateHistoryList();  // Refresh history when the tab is clicked
    });


    function showSection(sectionId) {
        const sections = [forecastSection, billsIncomeSection, accountSection, historySection, calendarSection]; // Include historySection
        sections.forEach(section => section.classList.remove('active')); // Remove 'active' class from all sections
        document.getElementById(sectionId).classList.add('active'); // Add 'active' class to the clicked section

        if (sectionId === "history") {
            updateHistoryList(); // Update history when this tab is opened
        } else if (sectionId === "calendar") {
            reRenderCalendar();
        }
    }


    function updateHistoryList() {
        const historyList = document.getElementById("history-list");
        const paidItems = [];

        // Get one-time paid payments from local storage
        const paidOneTimePayments = JSON.parse(localStorage.getItem("paidOneTimePayments")) || [];

        // Add the one-time payments to the history
        paidItems.push(...paidOneTimePayments);

        // Continue with your existing code for populating the history list
        paidItems.sort((a, b) => a.date - b.date); // Sort by date

        let runningBalance = 0; // Optionally keep track of a running balance in history

        historyList.innerHTML = paidItems.map(item => {
            const itemAmount = item.type === "income" ? item.amount : -item.amount;
            runningBalance += itemAmount;

            const balanceClass = runningBalance < 0 ? "negative" : "positive";
            const displayDate = new Date(item.date);
            const dayOfWeek = displayDate.toLocaleDateString(undefined, { weekday: 'short' });
            const dueDate = displayDate.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric', year: '2-digit' });

            return `
                <div class="forecast-item ${item.type}">
                    <div class="item-row top-row">
                            <span class="day-of-week">${dayOfWeek}</span>
                            <span class="bill-name">${item.name}</span>
                            <span class="bill-amount">$${item.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div class="item-row bottom-row">
                        <span class="due-date" id="date-${item.occurrenceId}">${dueDate}</span>
                        <button class="paid-button" onclick="markAsUnpaid('${item.id}', '${item.occurrenceId}', this.closest('.forecast-item'))">UnPaid</button>
                        <span class="running-balance ${balanceClass}">$${runningBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                </div>
            `;
        }).join('');
    }


    function getNextOccurrenceDate(currentDate, frequency, form_selected_date) {
        let nextDate = new Date(currentDate);
        switch (frequency) {
            case "daily":
                nextDate.setDate(nextDate.getDate() + 1);
                break;
            case "weekly":
                nextDate.setDate(nextDate.getDate() + 7);
                break;
            case "biweekly":
                nextDate.setDate(nextDate.getDate() + 14);
                break;
            case "monthly":
                if (form_selected_date) {
                    nextDate = adjustDate(nextDate, 'monthly', form_selected_date)
                } else {
                    nextDate.setMonth(nextDate.getMonth() + 1);
                }
                break;
            case "quarterly":
                if (form_selected_date) {
                    nextDate = adjustDate(nextDate, 'quarter', form_selected_date)
                } else {
                    nextDate.setMonth(nextDate.getMonth() + 3);
                }
                break;
            case "yearly":
                nextDate.setFullYear(nextDate.getFullYear() + 1);
                break;
            case "one-time": // Add this case
                nextDate = null; // No next occurrence for one-time bills
                break;
            default:
                console.error("Unknown frequency:", frequency);
                break;
        }

        return nextDate;
    }



    function adjustDate(date, type, form_selected_date) {

        let extract_date_str = form_selected_date // This is a string like "2024-08-31"

        // Convert the extracted date string to a Date object

        let dateParts_2 = extract_date_str.split('-'); // Split the string into [year, month, day]

        let year_2 = parseInt(dateParts_2[0], 10);
        let month_2 = parseInt(dateParts_2[1], 10) - 1; // Months are 0-based in JavaScript
        let day_2 = parseInt(dateParts_2[2], 10);

        // Create the Date object using local time
        let extract_date = new Date(year_2, month_2, day_2);

        // Now, get the day, month, and year
        let day = extract_date.getDate();
        let month = date.getMonth(); // Note: months are zero-indexed (January is 0)
        let year = date.getFullYear();

        // Adjust the month (add 1 to move to the next month)
        let newDate = new Date();
        if (type == 'monthly') {
            newDate = new Date(year, month + 1, day);
        } else {
            newDate = new Date(year, month + 3, day);
        }

        // If the day rolled over to the next month (e.g., from January 31 to February 2), adjust it back
        if (newDate.getMonth() !== month + 1 && newDate.getDate() !== day) {
            newDate.setDate(0); // Set to the last day of the previous month
        }
        // Return the adjusted date
        return newDate;
    }


    function showSection(sectionId) {
        // Get all the sections you want to toggle
        const sections = [forecastSection, billsIncomeSection, accountSection, historySection, calendarSection];

        // Hide all sections by removing 'active' class and setting display to 'none'
        sections.forEach(section => {
            section.classList.remove('active');  // Remove the 'active' class
            section.style.display = 'none';      // Ensure the section is hidden
        });

        // Show the selected section
        const activeSection = document.getElementById(sectionId);
        if (activeSection) {
            activeSection.classList.add('active');  // Add the 'active' class
            activeSection.style.display = 'block';  // Display the selected section
        }

        // If the history section is selected, refresh the history list
        if (sectionId === "history") {
            updateHistoryList();  // Only update history if switching to the history tab
        } else if (sectionId === "calendar") {
            reRenderCalendar();
        }
    }


    function handleFormSubmit(e) {
        e.preventDefault();
        const entry = getFormData();
        const editIndex = editIndexInput.value;

        if (editIndex) {
            // Update existing item
            billsIncomeList[editIndex] = entry;
        } else {
            // Add new item
            billsIncomeList.push(entry);
        }

        saveData();
        updateBillsIncomeList();
        updateForecastList();
        billsIncomeForm.reset();
        editIndexInput.value = ""; // Reset edit index
    }

    function getFormData() {
        const type = document.getElementById("type").value;
        const amount = parseFloat(document.getElementById("amount").value) || 0;
        const name = document.getElementById("name").value;
        let dateDue = document.getElementById("date-due").value;

        // Convert the date to a UTC Date object
        const dateObject = new Date(dateDue + 'T00:00:00Z');

        // Ensure you're storing the UTC date as a string in the same format
        dateDue = dateObject.toISOString().split('T')[0];

        const form_selected_date = dateDue

        const frequency = document.getElementById("frequency").value;
        const id = `${name}-${amount}-${dateObject.getTime()}`;

        return { id, type, amount, name, dateDue, frequency, paid: [], form_selected_date };
    }


    function saveData() {
        localStorage.setItem("balance", balance.toFixed(2));
        localStorage.setItem("billsIncomeList", JSON.stringify(billsIncomeList));
        localStorage.setItem("modifiedOccurrences", JSON.stringify(modifiedOccurrences));
    }


    function updateBillsIncomeList() {
        billsIncomeListElement.innerHTML = billsIncomeList.map((item, index) => {
            const frequencyDisplay = item.frequency === 'one-time' ? 'One-Time' : item.frequency.charAt(0).toUpperCase() + item.frequency.slice(1);
            return `
                <div class="bill-item">
                    <span class="${item.type}">${item.name} - $${item.amount.toFixed(2)} (Due: ${item.dateDue}, Frequency: ${frequencyDisplay})</span>
                    <button onclick="editItem(${index})">Edit</button>
                    <button onclick="removeItem(${index})">Remove</button>
                </div>
            `;
        }).join('');
    }


    window.editItem = function (index) {
        const item = billsIncomeList[index];
        document.getElementById("type").value = item.type;
        document.getElementById("amount").value = item.amount;
        document.getElementById("name").value = item.name;
        document.getElementById("date-due").value = item.dateDue;
        document.getElementById("frequency").value = item.frequency;
        editIndexInput.value = index; // Store the index in a hidden input for editing
        billsIncomeForm.scrollIntoView({ behavior: "smooth" });
    };

    window.removeItem = function (index) {
        billsIncomeList.splice(index, 1);  // Remove the item from the array
        saveData();  // Save the updated list to localStorage
        updateBillsIncomeList();  // Update the Bills & Income list
        updateForecastList();  // Update the forecast list in case the item was in the forecast
    };

    function updateForecastList() {
        const allOccurrences = [];
        let runningBalance = parseFloat(balanceInput.value) || 0;

        const fiftyYearsFromNow = new Date();
        fiftyYearsFromNow.setFullYear(fiftyYearsFromNow.getFullYear() + 10);

        // Get the permanentDelete list from localStorage
        const permanentDelete = JSON.parse(localStorage.getItem("permanentDelete")) || [];

        // Gather all occurrences based on the frequency of each item
        billsIncomeList.forEach(item => {
            let dateParts = item.form_selected_date.split('-');
            let year = parseInt(dateParts[0], 10);
            let month = parseInt(dateParts[1], 10) - 1;
            let day = parseInt(dateParts[2], 10);

            let nextDate = new Date(year, month, day);

            while (nextDate <= fiftyYearsFromNow && nextDate !== null) {
                const occurrenceId = `${item.id}-${nextDate.getTime()}`;

                // Check if this occurrenceId is in the permanentDelete list or paid list
                if (permanentDelete.includes(occurrenceId) || (item.paid && item.paid.includes(occurrenceId))) {
                    // Skip this occurrence if it was permanently deleted or marked as paid
                    nextDate = getNextOccurrenceDate(nextDate, item.frequency, item.form_selected_date);
                    continue;
                }

                const modifiedItem = modifiedOccurrences.find(mod => mod.occurrenceId === occurrenceId);

                if (modifiedItem) {
                    allOccurrences.push(modifiedItem);
                } else {
                    allOccurrences.push({
                        id: item.id,
                        occurrenceId: occurrenceId,
                        name: item.name,
                        type: item.type,
                        amount: item.amount,
                        date: new Date(nextDate),
                        frequency: item.frequency // Add frequency to the occurrence
                    });
                }

                if (item.frequency === "one-time") {
                    break; // Only one occurrence for one-time bills
                }

                // Get the next occurrence date based on the frequency of the item
                nextDate = getNextOccurrenceDate(nextDate, item.frequency, item.form_selected_date);
            }
        });

        // Sort the occurrences by date
        allOccurrences.sort((a, b) => a.date - b.date);

        let startDate;
        let endDate;

        if (allOccurrences.length > 0) {
            const firstOccurrenceDate = new Date(allOccurrences[0].date); // Use the first date as the start date
            startDate = firstOccurrenceDate; // Starting from the first occurrence date

            // Retrieve the forecast period from local storage and convert it to months
            const forecastPeriodMonths = parseFloat(localStorage.getItem("set_forecast_period")) || 3;

            // Calculate the year and month manually
            let endYear = startDate.getFullYear();
            let endMonth = startDate.getMonth() + forecastPeriodMonths;

            // Adjust the year based on how many full years the months add up to
            endYear += Math.floor(endMonth / 12);
            endMonth = endMonth % 12; // Ensure the month is within [0, 11] range

            // Set the end date with the correct year and month
            endDate = new Date(startDate);
            endDate.setFullYear(endYear);
            endDate.setMonth(endMonth);

            // If the new month doesn't have enough days (e.g., Feb 30), adjust to the last day of the month
            if (startDate.getDate() > endDate.getDate()) {
                endDate.setDate(0); // Set to the last day of the previous month
            }
        }

        // Clear the forecast list and only display items within the date range
        forecastList.innerHTML = '';  // Clear the forecast list

        allOccurrences.forEach(item => {
            const itemDate = new Date(item.date);

            // Check if the item falls within the forecast period
            if (itemDate >= startDate && itemDate <= endDate) {
                const itemAmount = item.type === "income" ? item.amount : -item.amount;
                runningBalance += itemAmount;

                const balanceClass = runningBalance < 0 ? "negative" : "positive";
                const dayOfWeek = itemDate.toLocaleDateString(undefined, { weekday: 'short' });
                let dueDate = itemDate.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric', year: '2-digit' });

                const today = new Date();
                const tomorrow = new Date();
                tomorrow.setDate(today.getDate() + 1); // Correctly move to tomorrow's date

                let className = '';
                if (itemDate.toDateString() === today.toDateString()) {
                    className = 'due-today';
                } else if (itemDate.toDateString() === tomorrow.toDateString()) {
                    className = 'due-tomorrow'; // Correctly apply tomorrow's due date style
                } else if (itemDate < today) {
                    className = 'overdue';
                }

                // Render only the items within the selected date range
                forecastList.innerHTML += `
                <div class="forecast-item ${item.type} ${className}" data-occurrence-id="${item.occurrenceId}">
                    <div class="item-row top-row">
                        <span class="day-of-week">${dayOfWeek}</span>
                        <span class="bill-name">${item.name}</span>
                        <span class="bill-amount" id="amount-${item.occurrenceId}">$${item.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div class="item-row bottom-row">
                        <span class="due-date" id="date-${item.occurrenceId}">${dueDate}</span>
                        <button class="paid-button" onclick="markAsPaid('${item.id}', '${item.occurrenceId}')">Paid</button>
                        <button class="edit-button" onclick="editForecastItem('${item.occurrenceId}')">Edit</button>
                        <span class="running-balance ${balanceClass}">$${runningBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                </div>
            `;
            }
        });

        // Add the final balance at the end
        const finalBalanceItem = document.createElement("div");
        finalBalanceItem.className = "forecast-item final-balance";
        finalBalanceItem.innerHTML = `<strong>Final Balance: $${runningBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>`;
        forecastList.appendChild(finalBalanceItem);

        // Update the final balance in the index.html element
        const finalBalanceElement = document.getElementById('final-balance-amount');

        if (finalBalanceElement) {
            finalBalanceElement.textContent = `$${runningBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

            // Set the color based on whether the balance is positive or negative
            if (runningBalance >= 0) {
                finalBalanceElement.style.color = 'green'; // Positive balance
            } else {
                finalBalanceElement.style.color = 'red';   // Negative balance
            }
        }
    }





    window.editForecastItem = function (occurrenceId) {
        const dateElement = document.getElementById(`date-${occurrenceId}`);
        const currentDateText = dateElement.textContent.trim();
        const currentAmountElement = document.getElementById(`amount-${occurrenceId}`);
        const currentAmountText = currentAmountElement.textContent.replace('$', '').replace(/,/g, '').trim();
        const currentAmount = parseFloat(currentAmountText) || 0;

        // Hide the Paid and Edit buttons
        const paidButton = dateElement.parentNode.querySelector('.paid-button');
        const editButton = dateElement.parentNode.querySelector('.edit-button');
        if (paidButton) paidButton.style.display = 'none';
        if (editButton) editButton.style.display = 'none';

        // Replace the date display with an input field
        dateElement.innerHTML = `<input type="date" id="edit-date-${occurrenceId}" value="${new Date(currentDateText).toISOString().split('T')[0]}">`;

        // Replace the amount display with an input field
        currentAmountElement.innerHTML = `<input type="number" id="edit-amount-${occurrenceId}" class="amount-input" value="${currentAmount.toFixed(2)}" style="width: 100px;">`;

        // Add a save button if not already present
        const existingSaveButton = dateElement.nextElementSibling && dateElement.nextElementSibling.classList.contains('save-button');
        if (!existingSaveButton) {
            dateElement.insertAdjacentHTML('afterend', `<button class="save-button" style="margin-left: 15px;" onclick="saveForecastItem('${occurrenceId}')">Save</button>`);
        }

        // Automatically select the text when the input gains focus
        const amountInput = document.getElementById(`edit-amount-${occurrenceId}`);
        amountInput.addEventListener('focus', function () {
            this.select();
        });

        // Set focus to the amount input field to trigger the auto-select
        amountInput.focus();

        // Allow saving when pressing "Enter"
        amountInput.addEventListener("keypress", function (event) {
            if (event.key === "Enter") {
                event.preventDefault();
                saveForecastItem(occurrenceId);
            }
        });
    };


    window.saveForecastItem = function (occurrenceId) {

        const newDateElement = document.getElementById(`edit-date-${occurrenceId}`);
        const newAmountElement = document.getElementById(`edit-amount-${occurrenceId}`);

        // Parse the new date from the input field as a local date (ignoring time zone shifts)
        const [year, month, day] = newDateElement.value.split('-');
        const newDate = new Date(year, month - 1, day); // Avoid using UTC to prevent timezone issues

        const newAmount = parseFloat(newAmountElement.value) || 0;

        // Find the original item by its occurrenceId
        const originalItem = billsIncomeList.find(item => occurrenceId.startsWith(item.id));

        if (!originalItem) {
            console.error('Original item not found for occurrence:', occurrenceId);
            return;
        }

        // Create a modified occurrence object
        const modifiedOccurrence = {
            ...originalItem, // Use the original item as a base
            occurrenceId: occurrenceId,
            date: newDate,
            amount: newAmount,
        };

        // Check if this occurrence was already modified
        const modifiedItemIndex = modifiedOccurrences.findIndex(item => item.occurrenceId === occurrenceId);

        if (modifiedItemIndex > -1) {
            // Update the existing modified occurrence
            modifiedOccurrences[modifiedItemIndex] = modifiedOccurrence;
        } else {
            // Add a new modified occurrence
            modifiedOccurrences.push(modifiedOccurrence);
        }

        // Save modified occurrences to local storage
        localStorage.setItem('modifiedOccurrences', JSON.stringify(modifiedOccurrences));

        // Update the forecast list to reflect the changes
        updateForecastList();
        updateHistoryList();

        // Optionally, update the running balance immediately
        balanceInput.value = balance.toFixed(2);
    };



    function updateHistoryList() {
        const historyList = document.getElementById("history-list");
        const paidItems = [];

        billsIncomeList.forEach(item => {
            if (item.paid && item.paid.length > 0) {
                item.paid.forEach(occurrenceId => {
                    // Check if the occurrence has been modified
                    const modifiedItem = modifiedOccurrences.find(mod => mod.occurrenceId === occurrenceId);
                    let occurrence = item;

                    if (modifiedItem) {
                        occurrence = modifiedItem; // Use the modified occurrence if it exists
                    }

                    const occurrenceDate = new Date(parseInt(occurrenceId.split('-').pop()));
                    paidItems.push({
                        ...occurrence,
                        date: modifiedItem ? modifiedItem.date : occurrenceDate // Use modified date if available
                    });
                });
            }
        });

        paidItems.sort((a, b) => a.date - b.date);

        let runningBalance = 0;

        historyList.innerHTML = paidItems.map(item => {
            const itemAmount = item.type === "income" ? item.amount : -item.amount;
            runningBalance += itemAmount;

            const balanceClass = runningBalance < 0 ? "negative" : "positive";
            const displayDate = new Date(item.date);
            const dayOfWeek = displayDate.toLocaleDateString(undefined, { weekday: 'short' });
            const dueDate = displayDate.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric', year: '2-digit' });

            return `
                <div class="forecast-item ${item.type}">
                    <div class="item-row top-row">
                            <span class="day-of-week">${dayOfWeek}</span>
                            <span class="bill-name">${item.name}</span>
                            <span class="bill-amount">$${item.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div class="item-row bottom-row">
                        <span class="due-date" id="date-${item.occurrenceId}">${dueDate}</span>
                        <button class="paid-button" onclick="markAsUnpaid('${item.id}', '${item.occurrenceId}', this.closest('.forecast-item'))">UnPaid</button>
                        <span class="running-balance ${balanceClass}">$${runningBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                </div>
            `;
        }).join('');
    }


    function updateHistoryList() {
        const historyList = document.getElementById("history-list");
        const paidItems = [];

        billsIncomeList.forEach(item => {
            if (item.paid && item.paid.length > 0) {
                item.paid.forEach(occurrenceId => {
                    // Check if the occurrence has been modified
                    const modifiedItem = modifiedOccurrences.find(mod => mod.occurrenceId === occurrenceId);
                    let occurrence = item;

                    if (modifiedItem) {
                        occurrence = modifiedItem; // Use the modified occurrence if it exists
                    }

                    const occurrenceDate = new Date(parseInt(occurrenceId.split('-').pop()));
                    paidItems.push({
                        ...occurrence,
                        date: modifiedItem ? modifiedItem.date : occurrenceDate,
                        occurrenceId: occurrenceId
                    });
                });
            }
        });

        let oneTimePaymentsBill = JSON.parse(localStorage.getItem("paidOneTimePayments")) || [];

        oneTimePaymentsBill.forEach(item => {
            item.paid.forEach(occurrenceId => {
                // Check if the occurrence has been modified
                const modifiedItem = modifiedOccurrences.find(mod => mod.occurrenceId === occurrenceId);
                let occurrence = item;

                if (modifiedItem) {
                    occurrence = modifiedItem; // Use the modified occurrence if it exists
                }

                const occurrenceDate = new Date(parseInt(occurrenceId.split('-').pop()));
                paidItems.push({
                    ...occurrence,
                    date: modifiedItem ? modifiedItem.date : occurrenceDate,
                    occurrenceId: occurrenceId
                });
            });
        });

        paidItems.sort((a, b) => b.date - a.date); // Sort by date

        let runningBalance = 0; // Optionally keep track of a running balance in history

        historyList.innerHTML = paidItems.map(item => {
            const itemAmount = item.type === "income" ? item.amount : -item.amount;
            runningBalance += itemAmount;

            const balanceClass = runningBalance < 0 ? "negative" : "positive";
            const displayDate = new Date(item.date);
            const dayOfWeek = displayDate.toLocaleDateString(undefined, { weekday: 'short' });
            const dueDate = displayDate.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric', year: '2-digit' });
            return `
                <div class="forecast-item ${item.type}">
                    <div class="item-row top-row">
                            <span class="day-of-week">${dayOfWeek}</span>
                            <span class="bill-name">${item.name}</span>
                            <span class="bill-amount">$${item.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div class="item-row bottom-row">
                        <span class="due-date" id="date-${item.occurrenceId}">${dueDate}</span>
                        <button class="paid-button" onclick="markAsUnpaid('${item.id}', '${item.occurrenceId}', this.closest('.forecast-item'))">UnPaid</button>
                        <span class="running-balance ${balanceClass}">$${runningBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                </div>
            `;
        }).join('');
    }




    window.markAsPaid = function (id, occurrenceId) {
        const itemElement = document.querySelector(`[data-occurrence-id='${occurrenceId}']`);

        if (itemElement) {
            // Add the animation class to the item
            itemElement.classList.add('slide-out');

            // Delay the actual data changes to allow the animation to finish
            setTimeout(() => {
                const originalIndex = billsIncomeList.findIndex(item => item.id === id);
                if (originalIndex === -1) return;

                const originalItem = billsIncomeList[originalIndex];
                const modifiedIndex = modifiedOccurrences.findIndex(mod => mod.occurrenceId === occurrenceId);
                let occurrence = originalItem;

                if (modifiedIndex > -1) {
                    occurrence = modifiedOccurrences[modifiedIndex];
                }

                if (occurrence.type === "bill") {
                    balance -= occurrence.amount;
                } else if (occurrence.type === "income") {
                    balance += occurrence.amount;
                }

                if (!originalItem.paid) {
                    originalItem.paid = [];
                }
                originalItem.paid.push(occurrenceId);

                if (modifiedIndex > -1) {
                    modifiedOccurrences[modifiedIndex].paid = true;
                }

                if (originalItem.frequency === "one-time") {
                    billsIncomeList = billsIncomeList.filter(item => item.id !== id);
                    const paidOneTimePayments = JSON.parse(localStorage.getItem("paidOneTimePayments")) || [];
                    const paidItem = { ...originalItem, date: new Date(parseInt(occurrenceId.split('-').pop())) };
                    paidOneTimePayments.push(paidItem);
                    localStorage.setItem("paidOneTimePayments", JSON.stringify(paidOneTimePayments));
                    modifiedOccurrences.push(paidItem);
                } else {
                    const currentOccurrenceDate = new Date(parseInt(occurrenceId.split('-').pop()));
                    let nextOccurrenceDate = getNextOccurrenceDate(currentOccurrenceDate, originalItem.frequency, originalItem.form_selected_date);
                    originalItem.dateDue = nextOccurrenceDate.toISOString().split('T')[0];
                }

                saveData();
                balanceInput.value = balance.toFixed(2);
                updateForecastList();
                updateBillsIncomeList();
                updateHistoryList();
            }, 600);  // Adjust this delay to match the animation duration
        }
    };


    window.markAsUnpaid = function (id, occurrenceId, itemElement) {
        // Add the animation class to the item (optional)
        itemElement.classList.add('slide-out');

        // Delay the actual data changes to allow the animation to finish
        setTimeout(() => {
            // Try to find the one-time payment in paidOneTimePayments
            let paidOneTimePayments = JSON.parse(localStorage.getItem("paidOneTimePayments")) || [];
            const oneTimePaymentIndex = paidOneTimePayments.findIndex(item => item.id === id);

            // Case 1: If the payment is a one-time payment
            if (oneTimePaymentIndex !== -1) {
                const oneTimePayment = paidOneTimePayments[oneTimePaymentIndex];

                // Reverse the balance adjustment
                if (oneTimePayment.type === "bill") {
                    balance += oneTimePayment.amount; // Add the bill amount back
                } else if (oneTimePayment.type === "income") {
                    balance -= oneTimePayment.amount; // Subtract the income amount
                }

                // Remove from the paidOneTimePayments list
                paidOneTimePayments.splice(oneTimePaymentIndex, 1);
                localStorage.setItem("paidOneTimePayments", JSON.stringify(paidOneTimePayments));

                // Add the unpaid item back to billsIncomeList with cleared paid status
                billsIncomeList.push({
                    ...oneTimePayment,
                    paid: [] // Clear the paid array
                });

            } else {
                // Case 2: If it's a regular payment stored in billsIncomeList
                const billsIncomeIndex = billsIncomeList.findIndex(item => item.id === id);
                if (billsIncomeIndex === -1) return; // If not found, exit the function

                const billItem = billsIncomeList[billsIncomeIndex];

                // Reverse the balance adjustment
                if (billItem.type === "bill") {
                    balance += billItem.amount; // Add the bill amount back
                } else if (billItem.type === "income") {
                    balance -= billItem.amount; // Subtract the income amount
                }

                // Remove the occurrenceId from the paid array
                if (billItem.paid) {
                    billItem.paid = billItem.paid.filter(paidId => paidId !== occurrenceId);
                }

                // If no more occurrences are marked as paid, we don't need to move it elsewhere
                billsIncomeList[billsIncomeIndex] = billItem;
            }

            // Save changes to localStorage
            saveData();

            // Update balance in the input field
            balanceInput.value = balance.toFixed(2);

            // Update the forecast, bills, and history lists
            updateForecastList();
            updateBillsIncomeList();
            updateHistoryList();

        }, 600); // Delay matching the animation duration
    };


    function getFrequencyIncrement(frequency) {
        const oneDay = 24 * 60 * 60 * 1000;
        switch (frequency) {
            case "daily":
                return oneDay;
            case "weekly":
                return oneDay * 7;
            case "biweekly":
                return oneDay * 14;
            case "monthly":
                return oneDay * 30;
            case "quarterly":
                return oneDay * 90;
            case "yearly":
                return oneDay * 365;
            default:
                return 0;
        }
    }

    function handleBackup() {
        const data = {
            balance: balance,
            billsIncomeList: billsIncomeList,
            modifiedOccurrences: modifiedOccurrences
        };
        const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'cashflow.json';
        a.click();
        URL.revokeObjectURL(url);
    }

    function handleRestore(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function (event) {
                try {
                    const data = JSON.parse(event.target.result);
                    balance = data.balance;
                    billsIncomeList = data.billsIncomeList;
                    modifiedOccurrences = data.modifiedOccurrences || [];
                    saveData();
                    updateBillsIncomeList();
                    updateForecastList();
                    balanceInput.value = balance.toFixed(2);

                    // Show success message
                    const successMessage = document.getElementById("restore-success-message");
                    successMessage.style.display = "block";

                    // Refresh the page after a short delay to load everything correctly
                    setTimeout(() => {
                        location.reload();
                    }, 1500); // Adjust the delay as needed
                } catch (error) {
                    console.error('Error restoring data:', error);
                    alert('Failed to restore data. Please make sure the file is correct.');
                }
            };
            reader.readAsText(file);
        }
    }



    updateForecastList();
    updateBillsIncomeList();

    const forecast_period = document.getElementById("forecast-period")
    const starting_forecast_period = parseFloat(localStorage.getItem("set_forecast_period")) || 3;

    forecast_period.value = starting_forecast_period

    forecast_period.addEventListener("change", function () {
        localStorage.setItem("set_forecast_period", forecast_period.value)
        updateForecastList()
    });

});


