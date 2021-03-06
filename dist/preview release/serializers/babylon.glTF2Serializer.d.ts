
declare module BABYLON {
    /**
     * Holds a collection of exporter options and parameters
     */
    interface IExporterOptions {
        /**
         * Function which indicates whether a babylon mesh should be exported or not.
         * @param mesh - source Babylon mesh. It is used to check whether it should be
         * exported to glTF or not.
         * @returns boolean, which indicates whether the mesh should be exported (true) or not (false)
         */
        shouldExportMesh?(mesh: AbstractMesh): boolean;
    }
    /**
     * Class for generating glTF data from a Babylon scene.
     */
    class GLTF2Export {
        /**
         * Exports the geometry of the scene to .gltf file format.
         * @param scene - Babylon scene with scene hierarchy information.
         * @param filePrefix - File prefix to use when generating the glTF file.
         * @param options - Exporter options.
         * @returns - Returns an object with a .gltf file and associates texture names
         * as keys and their data and paths as values.
         */
        static GLTF(scene: Scene, filePrefix: string, options?: IExporterOptions): _GLTFData;
        /**
         * Exports the geometry of the scene to .glb file format.
         * @param scene - Babylon scene with scene hierarchy information.
         * @param filePrefix - File prefix to use when generating glb file.
         * @param options - Exporter options.
         * @returns - Returns an object with a .glb filename as key and data as value
         */
        static GLB(scene: Scene, filePrefix: string, options?: IExporterOptions): _GLTFData;
    }
}


/**
 * Module for the Babylon glTF 2.0 exporter.  Should ONLY be used internally.
 * @ignore - capitalization of GLTF2 module.
 */
declare module BABYLON.GLTF2 {
    /**
     * Converts Babylon Scene into glTF 2.0.
     */
    class _Exporter {
        /**
         * Stores all generated buffer views, which represents views into the main glTF buffer data.
         */
        private bufferViews;
        /**
         * Stores all the generated accessors, which is used for accessing the data within the buffer views in glTF.
         */
        private accessors;
        /**
         * Stores all the generated nodes, which contains transform and/or mesh information per node.
         */
        private nodes;
        /**
         * Stores the glTF asset information, which represents the glTF version and this file generator.
         */
        private asset;
        /**
         * Stores all the generated glTF scenes, which stores multiple node hierarchies.
         */
        private scenes;
        /**
         * Stores all the generated mesh information, each containing a set of primitives to render in glTF.
         */
        private meshes;
        /**
         * Stores all the generated material information, which represents the appearance of each primitive.
         */
        private materials;
        /**
         * Stores all the generated texture information, which is referenced by glTF materials.
         */
        private textures;
        /**
         * Stores all the generated image information, which is referenced by glTF textures.
         */
        private images;
        /**
         * Stores the total amount of bytes stored in the glTF buffer.
         */
        private totalByteLength;
        /**
         * Stores a reference to the Babylon scene containing the source geometry and material information.
         */
        private babylonScene;
        /**
         * Stores the exporter options, which are optionally passed in from the glTF serializer.
         */
        private options?;
        /**
         * Stores a map of the image data, where the key is the file name and the value
         * is the image data.
         */
        private imageData;
        /**
         * Creates a glTF Exporter instance, which can accept optional exporter options.
         * @param babylonScene - Babylon scene object
         * @param options - Options to modify the behavior of the exporter.
         */
        constructor(babylonScene: Scene, options?: IExporterOptions);
        /**
         * Creates a buffer view based on teh supplied arguments
         * @param {number} bufferIndex - index value of the specified buffer
         * @param {number} byteOffset - byte offset value
         * @param {number} byteLength - byte length of the bufferView
         * @returns - bufferView for glTF
         */
        private createBufferView(bufferIndex, byteOffset, byteLength, name?);
        /**
         * Creates an accessor based on the supplied arguments
         * @param bufferviewIndex
         * @param name
         * @param type
         * @param componentType
         * @param count
         * @param min
         * @param max
         * @returns - accessor for glTF
         */
        private createAccessor(bufferviewIndex, name, type, componentType, count, min?, max?);
        /**
         * Calculates the minimum and maximum values of an array of floats, based on stride
         * @param buff
         * @param vertexStart
         * @param vertexCount
         * @param arrayOffset
         * @param stride
         * @returns - min number array and max number array
         */
        private calculateMinMax(buff, vertexStart, vertexCount, arrayOffset, stride);
        /**
         * Write mesh attribute data to buffer.
         * Returns the bytelength of the data.
         * @param vertexBufferType
         * @param submesh
         * @param meshAttributeArray
         * @param strideSize
         * @param byteOffset
         * @param dataBuffer
         * @param useRightHandedSystem
         * @returns - byte length
         */
        private writeAttributeData(vertexBufferType, submesh, meshAttributeArray, strideSize, byteOffset, dataBuffer, useRightHandedSystem);
        /**
         * Generates glTF json data
         * @param glb
         * @param glTFPrefix
         * @param prettyPrint
         * @returns - json data as string
         */
        private generateJSON(glb, glTFPrefix?, prettyPrint?);
        /**
         * Generates data for .gltf and .bin files based on the glTF prefix string
         * @param glTFPrefix
         * @returns - object with glTF json tex filename
         * and binary file name as keys and their data as values
         */
        _generateGLTF(glTFPrefix: string): _GLTFData;
        /**
         * Creates a binary buffer for glTF
         * @returns - array buffer for binary data
         */
        private generateBinary();
        /**
         * Pads the number to a power of 4
         * @param num - number to pad
         * @returns - padded number
         */
        private _getPadding(num);
        /**
         * Generates a glb file from the json and binary data.
         * Returns an object with the glb file name as the key and data as the value.
         * @param jsonText
         * @param binaryBuffer
         * @param glTFPrefix
         * @returns - object with glb filename as key and data as value
         */
        _generateGLB(glTFPrefix: string): _GLTFData;
        /**
         * Sets the TRS for each node
         * @param node
         * @param babylonMesh
         * @param useRightHandedSystem
         */
        private setNodeTransformation(node, babylonMesh, useRightHandedSystem);
        /**
         *
         * @param babylonTexture
         * @return - glTF texture, or null if the texture format is not supported
         */
        private exportTexture(babylonTexture, mimeType?);
        /**
         * Sets data for the primitive attributes of each submesh
         * @param mesh
         * @param babylonMesh
         * @param byteOffset
         * @param useRightHandedSystem
         * @param dataBuffer
         * @returns - bytelength of the primitive attributes plus the passed in byteOffset
         */
        private setPrimitiveAttributes(mesh, babylonMesh, byteOffset, useRightHandedSystem, dataBuffer?);
        /**
         * Creates a glTF scene based on the array of meshes.
         * Returns the the total byte offset.
         * @param gltf
         * @param byteOffset
         * @param buffer
         * @param dataBuffer
         * @returns bytelength + byteoffset
         */
        private createScene(babylonScene, byteOffset, dataBuffer?);
    }
}


declare module BABYLON {
    /**
     * Class for holding and downloading glTF file data
     */
    class _GLTFData {
        /**
         * Object which contains the file name as the key and its data as the value.
         */
        glTFFiles: {
            [fileName: string]: string | Blob;
        };
        /**
         * Initializes the glTF file object.
         */
        constructor();
        /**
         * Downloads the glTF data as files based on their names and data.
         */
        downloadFiles(): void;
    }
}


declare module BABYLON.GLTF2 {
    /**
     * Utility methods for working with glTF material conversion properties.  This class should only be used internally.
     */
    class _GLTFMaterial {
        /**
         * Represents the dielectric specular values for R, G and B.
         */
        private static readonly dielectricSpecular;
        /**
         * Epsilon value, used as a small tolerance value for a numeric value.
         */
        private static readonly epsilon;
        /**
         * Converts a Babylon StandardMaterial to a glTF Metallic Roughness Material.
         * @param babylonStandardMaterial
         * @returns - glTF Metallic Roughness Material representation
         */
        static ConvertToGLTFPBRMetallicRoughness(babylonStandardMaterial: StandardMaterial): IMaterialPbrMetallicRoughness;
        /**
         * Converts Specular Glossiness to Metallic Roughness.  This is based on the algorithm used in the Babylon glTF 3ds Max Exporter.
         * {@link https://github.com/BabylonJS/Exporters/blob/master/3ds%20Max/Max2Babylon/Exporter/BabylonExporter.GLTFExporter.Material.cs}
         * @param  babylonSpecularGlossiness - Babylon specular glossiness parameters
         * @returns - Babylon metallic roughness values
         */
        private static _ConvertToMetallicRoughness(babylonSpecularGlossiness);
        /**
         * Returns the perceived brightness value based on the provided color
         * @param color - color used in calculating the perceived brightness
         * @returns - perceived brightness value
         */
        private static PerceivedBrightness(color);
        /**
         * Computes the metallic factor
         * @param diffuse - diffused value
         * @param specular - specular value
         * @param oneMinusSpecularStrength - one minus the specular strength
         * @returns - metallic value
         */
        static SolveMetallic(diffuse: number, specular: number, oneMinusSpecularStrength: number): number;
        /**
         * Gets the glTF alpha mode from the Babylon Material
         * @param babylonMaterial - Babylon Material
         * @returns - The Babylon alpha mode value
         */
        static GetAlphaMode(babylonMaterial: Material): MaterialAlphaMode;
    }
}
