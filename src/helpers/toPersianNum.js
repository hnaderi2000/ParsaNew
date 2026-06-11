function toPersianNum(num) {
  const englishNumbers = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
  const persianNumbers = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

  let strNum = String(num); // Ensure the input is treated as a string
  let result = "";

  for (let i = 0; i < strNum.length; i++) {
    const char = strNum[i];
    const index = englishNumbers.indexOf(char);

    if (index !== -1) {
      result += persianNumbers[index];
    } else {
      result += char; // Keep non-digit characters as they are (e.g., slashes in dates)
    }
  }
  return result;
}

export { toPersianNum };
