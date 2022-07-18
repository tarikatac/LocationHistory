export class DateFormatter extends Date {

    constructor(dateString, timeString) {
        if(!dateString && !timeString) {
            super();
            return;
        } else if(!timeString) {
            super(dateString);
            return;
        }
        
        const dateParts = dateString.split('/');

        super(dateParts[0] + "-" + dateParts[1] + "-" + dateParts[2] + "T" + timeString + ":00");
    }

    getFormattedDate() {
        const yyyy = this.getFullYear();
        let mm = this.getMonth() + 1;
        let dd = this.getDate();
    
        if (dd < 10) dd = '0' + dd;
        if (mm < 10) mm = '0' + mm;
    
        return yyyy + '/' + mm + '/' + dd;
    }

    getFormattedTime(sec) {
        let hh = this.getHours();
        let mm = this.getMinutes();
        let ss = this.getSeconds();

        if (hh < 10) hh = '0' + hh;
        if (mm < 10) mm = '0' + mm;
        if (ss < 10) ss = '0' + ss;

        return hh + ":" + mm + (sec ? ":" + ss : "");
    }

    // TODO: expand for more validation
    static isValidDateFormat(string) {
        if(!string)
            return false;
        
        return /^\d\d\d\d\/\d\d\/\d\d/.test(string);
    }

    static isValidTimeFormat(string) {
        if(!string)
            return false;

        return /^\d\d:\d\d$/.test(string);
    }
}