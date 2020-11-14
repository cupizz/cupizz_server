import { NexusGenEnums } from "../schema/generated/nexus";

export function prop<T, K extends keyof T>(obj: T, key: K) {
    return obj[key];
}

export enum DistanceUnit {
    Mile = 'Mile',
    Km = 'Km',
    Meter = 'Meter'
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