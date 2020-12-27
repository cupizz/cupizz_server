import { NexusGenEnums } from "../schema/generated/nexus";

export function prop<T, K extends keyof T>(obj: T, key: K) {
    return obj[key];
}

export enum DistanceUnit {
    Mile = 'Mile',
    Km = 'Km',
    Meter = 'Meter'
}

export function calculateAge(birthday: Date): number {
    if (birthday) {
        const ageDifMs = Date.now() - birthday.getTime();
        const ageDate = new Date(ageDifMs);
        return Math.abs(ageDate.getUTCFullYear() - 1970);
    } else {
        return null;
    }
}

/**
 * @param unit Mi: Mile | K: Km | M : Meter
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number, unit: NexusGenEnums['DistanceUnitEnum'] = 'Km') {
    if ((lat1 === lat2) && (lon1 === lon2)) {
        return '0';
    }
    else {
        var radlat1 = Math.PI * lat1 / 180;
        var radlat2 = Math.PI * lat2 / 180;
        var theta = lon1 - lon2;
        var radtheta = Math.PI * theta / 180;
        var distance = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
        if (distance > 1) {
            distance = 1;
        }
        distance = Math.acos(distance);
        distance = distance * 180 / Math.PI;
        distance = distance * 60 * 1.1515;
        if (unit === 'Km') { distance = distance * 1.609344 }
        if (unit === 'Meter') { distance = distance * 1609.34 }

        return distance.toFixed(0);
    }
}

export function withCancel<T>(asyncIterator: AsyncIterator<T | undefined>, onCancel: Function): AsyncIterator<T | undefined> {
    return {
        ...asyncIterator,
        return() {
            onCancel()
            return asyncIterator.return ? asyncIterator.return() : Promise.resolve({ value: undefined, done: true })
        }
    }
}
/** 
 * Compares two Date objects and returns e number value that represents 
 * the result:
 * 0 if the two dates are equal.
 * 1 if the first date is greater than second.
 * -1 if the first date is less than second.
 * @param date1 First date object to compare.
 * @param date2 Second date object to compare.
 */
export function compareDate(date1: Date, date2: Date): number {
    // With Date object we can compare dates them using the >, <, <= or >=.
    // The ==, !=, ===, and !== operators require to use date.getTime(),
    // so we need to create a new instance of Date with 'new Date()'
    let d1 = new Date(date1); let d2 = new Date(date2);

    // Check if the dates are equal
    let same = d1.getTime() === d2.getTime();
    if (same) return 0;

    // Check if the first is greater than second
    if (d1 > d2) return 1;

    // Check if the first is less than second
    if (d1 < d2) return -1;
}
