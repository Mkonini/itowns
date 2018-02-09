import { Euler } from 'three';
import Coordinates from '../Geographic/Coordinates';

function toCoord(ori) {
    return new Coordinates('EPSG:2154', ori.easting, ori.northing, ori.altitude);
}

function toOri(ori) {
    const d2r = Math.PI / 180;
    return new Euler(
        ori.pitch * d2r,
        ori.roll * d2r,
        ori.heading * d2r, 'ZXY');
}

export const STEREOPOLIS = {
    toCoord,
    toOri,
};

export default {
    decode(arrayOE, convert) {
        if (!arrayOE || !(arrayOE instanceof Array)) {
            throw new Error('lol');
        }
        const result = new Array(arrayOE.length);

        for (let i = 0; i < arrayOE.length; ++i) {
            result[i] = {
                coord: convert.toCoord(arrayOE[i]),
                orientation: convert.toOri(arrayOE[i]),
            };
        }
        return result;
    },
};
