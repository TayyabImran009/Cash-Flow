const monthYear = document.getElementById('month-year');
const calendarDays = document.getElementById('calendar-days');
const prevMonthBtn = document.getElementById('prev-month');
const nextMonthBtn = document.getElementById('next-month');
const todayBtn = document.getElementById('today-btn');
let billsIncomeList = JSON.parse(localStorage.getItem("billsIncomeList")) || [];

const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

let date = new Date();
let currentMonth = date.getMonth();
let currentYear = date.getFullYear();

// Function to display calendar
// Function to display calendar
function displayCalendar(month, year) {
    calendarDays.innerHTML = ""; // Clear previous days
    monthYear.textContent = `${months[month]} ${year}`;

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Get today's date
    const today = new Date();
    const isCurrentMonth = (today.getMonth() === month && today.getFullYear() === year);
    const currentDay = today.getDate();

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
        day.innerHTML = `<span>${i} <br><br>$${calculateTotalAmountForSpecificDate(`${i}`, daysInMonth, month, year)}</span>`;

        // Highlight today's date
        if (isCurrentMonth && i === currentDay) {
            day.classList.add("today"); // Add the 'today' class
        }

        calendarDays.appendChild(day);
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



function calculateTotalAmountForSpecificDate(current_day, daysInMonth, month, year) {
    const targetDateString = new Date(year, month, current_day);
    const endDate = new Date(year, month, daysInMonth);
    const allOccurrences = [];
    const fiftyYearsFromNow = new Date();
    fiftyYearsFromNow.setFullYear(fiftyYearsFromNow.getFullYear() + 10);
    let runningBalance = 0;
    let modifiedOccurrences = JSON.parse(localStorage.getItem("modifiedOccurrences")) || [];

    // Convert string dates to Date objects
    modifiedOccurrences = modifiedOccurrences.map(item => ({
        ...item,
        date: new Date(item.date)
    }));

    billsIncomeList.forEach(item => {
        let dateParts = item.form_selected_date.split('-');
        let billYear = parseInt(dateParts[0], 10);
        let billMonth = parseInt(dateParts[1], 10) - 1;
        let billDay = parseInt(dateParts[2], 10);

        let nextDate = new Date(billYear, billMonth, billDay);

        while (nextDate <= fiftyYearsFromNow && nextDate !== null) {
            const occurrenceId = `${item.id}-${nextDate.getTime()}`;
            const modifiedItem = modifiedOccurrences.find(mod => mod.occurrenceId === occurrenceId);

            if (modifiedItem) {
                allOccurrences.push(modifiedItem);
            } else {
                // Check if the occurrence is in the paid list and skip it if found
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
                break; // Only one occurrence for one-time bills
            }

            // Get the next occurrence date based on the frequency of the item
            nextDate = getNextOccurrenceDate(nextDate, item.frequency, item.form_selected_date);
        }
    });

    allOccurrences.sort((a, b) => a.date - b.date);

    allOccurrences.forEach(item => {
        const itemDate = new Date(item.date);
        const itemDay = itemDate.getDate();
        const itemMonth = itemDate.getMonth();
        const itemYear = itemDate.getFullYear();

        // Check if the item falls on the exact target day
        if (itemDay == current_day && itemMonth == month && itemYear == year) {
            runningBalance += item.amount;
        }
    });

    return runningBalance;
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
