import * as THREE from 'three';
import TileMesh from './TileMesh';
import RendererConstant from '../Renderer/RendererConstant';
import { unpack1K } from '../Renderer/LayeredMaterial';

// TileMesh picking support function
function screenCoordsToNodeId(view, tileLayer, mouse) {
    const dim = view.mainLoop.gfxEngine.getWindowSize();

    mouse = mouse || new THREE.Vector2(Math.floor(dim.x / 2), Math.floor(dim.y / 2));

    const restore = tileLayer.level0Nodes.map(n => n.pushRenderState(RendererConstant.ID));

    // Prepare state
    const prev = view.camera.camera3D.layers.mask;
    view.camera.camera3D.layers.mask = 1 << tileLayer.threejsLayer;

    var buffer = view.mainLoop.gfxEngine.renderViewTobuffer(
        view,
        view.mainLoop.gfxEngine.fullSizeRenderTarget,
        mouse.x, dim.y - mouse.y,
        1, 1);

    restore.forEach(r => r());

    view.camera.camera3D.layers.mask = prev;

    var depthRGBA = new THREE.Vector4().fromArray(buffer).divideScalar(255.0);

    // unpack RGBA to float
    var unpack = unpack1K(depthRGBA, Math.pow(256, 3));

    return Math.round(unpack);
}

function findLayerIdInParent(obj) {
    if (obj.layer) {
        return obj.layer;
    }
    if (obj.parent) {
        return findLayerIdInParent(obj.parent);
    }
}

const raycaster = new THREE.Raycaster();

export default {
    pickTilesAt: (_view, mouse, layer) => {
        const results = [];
        const _id = screenCoordsToNodeId(_view, layer, mouse);

        const extractResult = (node) => {
            if (node.id === _id && node instanceof TileMesh) {
                results.push({
                    object: node,
                    layer: layer.id,
                });
            }
        };
        for (const n of layer.level0Nodes) {
            n.traverse(extractResult);
        }
        return results;
    },

    pickPointsAt: (view, mouse, layer) => {
        if (!layer.root) {
            return;
        }

        const dim = view.mainLoop.gfxEngine.getWindowSize();

        // enable picking mode for points material
        layer.object3d.traverse((o) => {
            if (o.isPoints && o.baseId) {
                o.material.enablePicking(true);
            }
        });

        // render 1 pixel
        // TODO: support more than 1 pixel selection
        const buffer = view.mainLoop.gfxEngine.renderViewTobuffer(
                view, view.mainLoop.gfxEngine.fullSizeRenderTarget,
                mouse.x, dim.y - mouse.y, 1, 1);

        // see PointCloudProvider and the construction of unique_id
        const objId = (buffer[0] << 8) | buffer[1];
        const index = (buffer[2] << 8) | buffer[3];

        let result;
        layer.object3d.traverse((o) => {
            if (o.isPoints && o.baseId) {
                // disable picking mode
                o.material.enablePicking(false);

                // if baseId matches objId, the clicked point belongs to `o`
                if (!result && o.baseId === objId) {
                    result = {
                        object: o,
                        index,
                        layer: layer.id,
                    };
                }
            }
        });

        if (result) {
            return [result];
        } else {
            return [];
        }
    },

    /*
     * Default picking method. Uses THREE.Raycaster
     */
    pickObjectsAt(mouse, camera, object, target = []) {
        // raycaster use NDC coordinate
        const ndc = {
            x: 2 * (mouse.x / camera.width) - 1,
            y: -2 * (mouse.y / camera.height) + 1,
        };
        raycaster.setFromCamera(ndc, camera.camera3D);
        const intersects = raycaster.intersectObject(object, true);
        for (const inter of intersects) {
            inter.layer = findLayerIdInParent(inter.object);
            target.push(inter);
        }

        return target;
    },
};
