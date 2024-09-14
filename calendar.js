const monthYear = document.getElementById('month-year');
const calendarDays = document.getElementById('calendar-days');
const prevMonthBtn = document.getElementById('prev-month');
const nextMonthBtn = document.getElementById('next-month');
const todayBtn = document.getElementById('today-btn');
const calendar_bill_list = document.getElementById('calendar-bill-list');
let billsIncomeList = JSON.parse(localStorage.getItem("billsIncomeList")) || [];

function reRenderCalendar() {
    billsIncomeList = JSON.parse(localStorage.getItem("billsIncomeList")) || [];

    date = new Date();
    currentMonth = date.getMonth();
    currentYear = date.getFullYear();
    displayCalendar(currentMonth, currentYear);
}

const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

let date = new Date();
let currentMonth = date.getMonth();
let currentYear = date.getFullYear();

// Function to display the calendar
function displayCalendar(month, year) {
    calendarDays.innerHTML = ""; // Clear previous days
    monthYear.textContent = `${months[month]} ${year}`;

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Get today's date
    const today = new Date();
    const isCurrentMonth = (today.getMonth() === month && today.getFullYear() === year);
    const currentDay = today.getDate();

    // Initialize running balance from localStorage
    let runningBalance = parseFloat(localStorage.getItem("balance")) || 0;

    // Adding blank days to align the first day
    for (let i = 0; i < firstDay; i++) {
        const blank = document.createElement("div");
        blank.classList.add("day");
        calendarDays.appendChild(blank);
    }

    // Adding days of the month
    for (let i = 1; i <= daysInMonth; i++) {
        const day = document.createElement("div");
        day.classList.add("day");

        const currentDate = new Date(year, month, i);
        let dayBalance = getTotalRunningBalance(currentDate)

        // Determine the class for the balance dot based on whether the balance is positive or negative
        let balanceDotClass = "";
        if (dayBalance < 0) {
            balanceDotClass = "red-dot"; // Class for red dot (negative balance)
        } else if (dayBalance > 0) {
            balanceDotClass = "green-dot"; // Class for green dot (positive balance)
        }

        // Only show the dot if there is a balance (i.e., a bill on this day)
        const balanceDot = `<div class="balance-dot today"></div>`
        // Create the inner HTML with the running balance for the day
        day.innerHTML = `
            <span>${i}</span>
            ${balanceDot}
            <br>
            <span class="${balanceDotClass}">$${dayBalance}</span>
        `;

        if (isCurrentMonth && i === currentDay) {
            day.innerHTML = `
            <span>${i}</span>
            ${balanceDot}
            <br>
            <span class="${balanceDotClass}">$${dayBalance}</span>
        `;
        }else{
            day.innerHTML = `
            <span>${i}</span>
            <br>
            <span class="${balanceDotClass}">$${dayBalance}</span>
        `;
        }

        day.addEventListener("click", () => {
            const selectedDate = new Date(year, month, i);
            displayBillsForDate(selectedDate); // Display bills for clicked date
        });

        calendarDays.appendChild(day);
    }
}


function getTotalRunningBalance(selectedDate) {
    calendar_bill_list.innerHTML = ""; // Clear previous bills

    const selectedDateString = selectedDate.toISOString().split('T')[0];
    const allOccurrences = [];
    let modifiedOccurrences = JSON.parse(localStorage.getItem("modifiedOccurrences")) || [];
    const billsIncomeList = JSON.parse(localStorage.getItem("billsIncomeList")) || [];
    const permanentDelete = JSON.parse(localStorage.getItem("permanentDelete")) || []; // Fetch permanentDelete list
    let totalRunningBalance = 0

    // Convert string dates to Date objects for modified occurrences
    modifiedOccurrences = modifiedOccurrences.map(item => ({
        ...item,
        date: new Date(item.date)
    }));

    const fiftyYearsFromNow = new Date();
    fiftyYearsFromNow.setFullYear(fiftyYearsFromNow.getFullYear() + 10);

    let initialBalance = parseFloat(localStorage.getItem("balance")) || 0; // Starting balance
    let runningBalance = initialBalance; // Initialize running balance with saved balance

    // Gather all occurrences based on the frequency of each item
    billsIncomeList.forEach(item => {
        let dateParts = item.form_selected_date.split('-');
        let year = parseInt(dateParts[0], 10);
        let month = parseInt(dateParts[1], 10) - 1;
        let day = parseInt(dateParts[2], 10);

        let nextDate = new Date(year, month, day);

        while (nextDate <= fiftyYearsFromNow && nextDate !== null) {
            const occurrenceId = `${item.id}-${nextDate.getTime()}`;
            const modifiedItem = modifiedOccurrences.find(mod => mod.occurrenceId === occurrenceId);

            // Check if the occurrence is in the permanentDelete list or paid list and skip it if found
            if (permanentDelete.includes(occurrenceId) || (item.paid && item.paid.includes(occurrenceId))) {
                nextDate = getNextOccurrenceDate(nextDate, item.frequency, item.form_selected_date);
                continue; // Skip this occurrence if it's in permanentDelete or paid
            }

            if (modifiedItem) {
                allOccurrences.push(modifiedItem);
            } else {
                if (!item.paid || !item.paid.includes(occurrenceId)) {
                    allOccurrences.push({
                        id: item.id,
                        occurrenceId: occurrenceId,
                        name: item.name,
                        type: item.type,
                        amount: item.amount,
                        date: new Date(nextDate),
                        frequency: item.frequency
                    });
                }
            }

            if (item.frequency === "one-time") {
                break;
            }

            nextDate = getNextOccurrenceDate(nextDate, item.frequency, item.form_selected_date);
        }
    });

    // Sort occurrences by date so we can calculate the balance progressively
    allOccurrences.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Calculate running balance up to the selected date (but not beyond)
    allOccurrences.forEach(item => {
        const itemDate = new Date(item.date).toISOString().split('T')[0];
        if (itemDate < selectedDateString) {

            const itemAmount = item.type === "income" ? item.amount : -item.amount;
            runningBalance += itemAmount;
        }
    });

    // Filter occurrences by selected date
    const billsForSelectedDate = allOccurrences.filter(item => {
        const itemDate = new Date(item.date).toISOString().split('T')[0];
        return itemDate === selectedDateString;
    });

    if (billsForSelectedDate.length === 0) {
        return 0
    } else {
        // Now display the bills for the selected date
        billsForSelectedDate.forEach(item => {
            // First, update the running balance before showing the bill
            const itemAmount = item.type === "income" ? item.amount : -item.amount;
            runningBalance += itemAmount

            totalRunningBalance = runningBalance
        });
    }

    return totalRunningBalance
}



function displayBillsForDate(selectedDate) {
    calendar_bill_list.innerHTML = ""; // Clear previous bills

    const selectedDateString = selectedDate.toISOString().split('T')[0];
    const allOccurrences = [];
    let modifiedOccurrences = JSON.parse(localStorage.getItem("modifiedOccurrences")) || [];
    const billsIncomeList = JSON.parse(localStorage.getItem("billsIncomeList")) || [];
    const permanentDelete = JSON.parse(localStorage.getItem("permanentDelete")) || []; // Fetch permanentDelete list

    // Convert string dates to Date objects for modified occurrences
    modifiedOccurrences = modifiedOccurrences.map(item => ({
        ...item,
        date: new Date(item.date)
    }));

    const fiftyYearsFromNow = new Date();
    fiftyYearsFromNow.setFullYear(fiftyYearsFromNow.getFullYear() + 10);

    let initialBalance = parseFloat(localStorage.getItem("balance")) || 0; // Starting balance
    let runningBalance = initialBalance; // Initialize running balance with saved balance

    // Gather all occurrences based on the frequency of each item
    billsIncomeList.forEach(item => {
        let dateParts = item.form_selected_date.split('-');
        let year = parseInt(dateParts[0], 10);
        let month = parseInt(dateParts[1], 10) - 1;
        let day = parseInt(dateParts[2], 10);

        let nextDate = new Date(year, month, day);

        while (nextDate <= fiftyYearsFromNow && nextDate !== null) {
            const occurrenceId = `${item.id}-${nextDate.getTime()}`;
            const modifiedItem = modifiedOccurrences.find(mod => mod.occurrenceId === occurrenceId);

            // Check if the occurrence is in the permanentDelete list or paid list and skip it if found
            if (permanentDelete.includes(occurrenceId) || (item.paid && item.paid.includes(occurrenceId))) {
                nextDate = getNextOccurrenceDate(nextDate, item.frequency, item.form_selected_date);
                continue; // Skip this occurrence if it's in permanentDelete or paid
            }

            if (modifiedItem) {
                allOccurrences.push(modifiedItem);
            } else {
                if (!item.paid || !item.paid.includes(occurrenceId)) {
                    allOccurrences.push({
                        id: item.id,
                        occurrenceId: occurrenceId,
                        name: item.name,
                        type: item.type,
                        amount: item.amount,
                        date: new Date(nextDate),
                        frequency: item.frequency
                    });
                }
            }

            if (item.frequency === "one-time") {
                break;
            }

            nextDate = getNextOccurrenceDate(nextDate, item.frequency, item.form_selected_date);
        }
    });

    // Sort occurrences by date so we can calculate the balance progressively
    allOccurrences.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Calculate running balance up to the selected date (but not beyond)
    allOccurrences.forEach(item => {
        const itemDate = new Date(item.date).toISOString().split('T')[0];
        if (itemDate < selectedDateString) {
            const itemAmount = item.type === "income" ? item.amount : -item.amount;
            runningBalance += itemAmount;
        }
    });

    // Filter occurrences by selected date
    const billsForSelectedDate = allOccurrences.filter(item => {
        const itemDate = new Date(item.date).toISOString().split('T')[0];
        return itemDate === selectedDateString;
    });

    if (billsForSelectedDate.length === 0) {
        calendar_bill_list.innerHTML = "<p>No bills for this date.</p>";
    } else {
        // Now display the bills for the selected date
        billsForSelectedDate.forEach(item => {
            // First, update the running balance before showing the bill
            const itemAmount = item.type === "income" ? item.amount : -item.amount;
            runningBalance += itemAmount;

            const balanceClass = runningBalance < 0 ? "negative" : "positive";
            const dayOfWeek = new Date(item.date).toLocaleDateString(undefined, { weekday: 'short' });
            const dueDate = new Date(item.date).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric', year: '2-digit' });

            const billItem = document.createElement("div");
            billItem.classList.add("forecast-item", item.type, "history-item-container");

            billItem.innerHTML = `
                <div class="forecast-item-container-contant">
                    <div class="item-row">
                        <span class="day-of-week">${dayOfWeek}</span>
                        <span class="bill-name">${item.name}</span>
                        <span class="bill-amount ${balanceClass}">$${item.amount.toFixed(2)}</span>
                    </div>
                    <div class="item-row bottom-row">
                        <span class="due-date">${dueDate}</span>
                        <span class="running-balance ${balanceClass}">$${runningBalance.toFixed(2)}</span>
                    </div>
                </div>
            `;

            calendar_bill_list.appendChild(billItem);
        });
    }
}




// Event listeners for buttons
prevMonthBtn.addEventListener("click", () => {
    currentMonth--;
    if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
    }
    displayCalendar(currentMonth, currentYear);
});

nextMonthBtn.addEventListener("click", () => {
    currentMonth++;
    if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    }
    displayCalendar(currentMonth, currentYear);
});

todayBtn.addEventListener("click", () => {
    date = new Date();
    currentMonth = date.getMonth();
    currentYear = date.getFullYear();
    displayCalendar(currentMonth, currentYear);
});

// Initial render
displayCalendar(currentMonth, currentYear);




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
