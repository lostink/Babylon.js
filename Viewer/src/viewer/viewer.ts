import { viewerManager } from './viewerManager';
import { TemplateManager } from './../templateManager';
import configurationLoader from './../configuration/loader';
import { Observable, Engine, Scene, ArcRotateCamera, Vector3, SceneLoader, AbstractMesh, Mesh, HemisphericLight, Database, SceneLoaderProgressEvent, ISceneLoaderPlugin, ISceneLoaderPluginAsync } from 'babylonjs';
import { ViewerConfiguration } from '../configuration/configuration';
import { PromiseObservable } from '../util/promiseObservable';

export abstract class AbstractViewer {

    public templateManager: TemplateManager;

    public engine: Engine;
    public scene: Scene;
    public baseId: string;

    /**
     * The last loader used to load a model. 
     * 
     * @type {(ISceneLoaderPlugin | ISceneLoaderPluginAsync)}
     * @memberof AbstractViewer
     */
    public lastUsedLoader: ISceneLoaderPlugin | ISceneLoaderPluginAsync;

    protected configuration: ViewerConfiguration;

    // observables
    public onSceneInitObservable: PromiseObservable<Scene>;
    public onEngineInitObservable: PromiseObservable<Engine>;
    public onModelLoadedObservable: PromiseObservable<AbstractMesh[]>;
    public onModelLoadProgressObservable: PromiseObservable<SceneLoaderProgressEvent>;
    public onInitDoneObservable: PromiseObservable<AbstractViewer>;

    protected canvas: HTMLCanvasElement;

    constructor(public containerElement: HTMLElement, initialConfiguration: ViewerConfiguration = {}) {
        // if exists, use the container id. otherwise, generate a random string.
        if (containerElement.id) {
            this.baseId = containerElement.id;
        } else {
            this.baseId = containerElement.id = 'bjs' + Math.random().toString(32).substr(2, 8);
        }

        this.onSceneInitObservable = new PromiseObservable();
        this.onEngineInitObservable = new PromiseObservable();
        this.onModelLoadedObservable = new PromiseObservable();
        this.onModelLoadProgressObservable = new PromiseObservable();
        this.onInitDoneObservable = new PromiseObservable();

        // add this viewer to the viewer manager
        viewerManager.addViewer(this);

        // create a new template manager. TODO - singleton?
        this.templateManager = new TemplateManager(containerElement);

        this.prepareContainerElement();

        // extend the configuration
        configurationLoader.loadConfiguration(initialConfiguration).then((configuration) => {
            this.configuration = configuration;

            // adding preconfigured functions
            if (this.configuration.observers) {
                if (this.configuration.observers.onEngineInit) {
                    this.onEngineInitObservable.add(window[this.configuration.observers.onEngineInit]);
                }
                if (this.configuration.observers.onSceneInit) {
                    this.onSceneInitObservable.add(window[this.configuration.observers.onSceneInit]);
                }
                if (this.configuration.observers.onModelLoaded) {
                    this.onModelLoadedObservable.add(window[this.configuration.observers.onModelLoaded]);
                }
            }

            // initialize the templates
            let templateConfiguration = this.configuration.templates || {};
            this.templateManager.initTemplate(templateConfiguration);
            // when done, execute onTemplatesLoaded()
            this.templateManager.onAllLoaded.add(() => {
                let canvas = this.templateManager.getCanvas();
                if (canvas) {
                    this.canvas = canvas;
                }
                this._onTemplateLoaded();
            });
        });

    }

    public getBaseId(): string {
        return this.baseId;
    }

    public isCanvasInDOM(): boolean {
        return !!this.canvas && !!this.canvas.parentElement;
    }

    protected resize = (): void => {
        // Only resize if Canvas is in the DOM
        if (!this.isCanvasInDOM()) {
            return;
        }

        if (this.canvas.clientWidth <= 0 || this.canvas.clientHeight <= 0) {
            return;
        }

        this.engine.resize();
    }

    protected render = (): void => {
        this.scene && this.scene.render();
    }

    public dispose() {
        window.removeEventListener('resize', this.resize);
    }

    protected abstract prepareContainerElement();

    /**
     * This function will execute when the HTML templates finished initializing.
     * It should initialize the engine and continue execution.
     * 
     * @protected
     * @returns {Promise<AbstractViewer>} The viewer object will be returned after the object was loaded.
     * @memberof AbstractViewer
     */
    protected onTemplatesLoaded(): Promise<AbstractViewer> {
        return Promise.resolve(this);
    }

    /**
     * This will force the creation of an engine and a scene.
     * It will also load a model if preconfigured.
     * But first - it will load the extendible onTemplateLoaded()!
     */
    private _onTemplateLoaded(): Promise<AbstractViewer> {
        return this.onTemplatesLoaded().then(() => {
            let autoLoadModel = !!this.configuration.model;
            return this.initEngine().then((engine) => {
                return this.onEngineInitObservable.notifyWithPromise(engine);
            }).then(() => {
                if (autoLoadModel) {
                    return this.loadModel();
                } else {
                    return this.scene || this.initScene();
                }
            }).then((scene) => {
                return this.onSceneInitObservable.notifyWithPromise(scene);
            }).then(() => {
                return this.onInitDoneObservable.notifyWithPromise(this);
            }).then(() => {
                return this;
            });
        })
    }

    /**
     * Initialize the engine. Retruns a promise in case async calls are needed.
     * 
     * @protected
     * @returns {Promise<Engine>} 
     * @memberof Viewer
     */
    protected initEngine(): Promise<Engine> {
        let canvasElement = this.templateManager.getCanvas();
        if (!canvasElement) {
            return Promise.reject('Canvas element not found!');
        }
        let config = this.configuration.engine || {};
        // TDO enable further configuration
        this.engine = new Engine(canvasElement, !!config.antialiasing, config.engineOptions);

        // Disable manifest checking
        Database.IDBStorageEnabled = false;

        if (!config.disableResize) {
            window.addEventListener('resize', this.resize);
        }


        this.engine.runRenderLoop(this.render);

        if (this.configuration.engine && this.configuration.engine.adaptiveQuality) {
            var scale = Math.max(0.5, 1 / (window.devicePixelRatio || 2));
            this.engine.setHardwareScalingLevel(scale);
        }

        return Promise.resolve(this.engine);
    }

    protected initScene(): Promise<Scene> {

        // if the scen exists, dispose it.
        if (this.scene) {
            this.scene.dispose();
        }

        // create a new scene
        this.scene = new Scene(this.engine);
        // make sure there is a default camera and light.
        this.scene.createDefaultCameraOrLight(true, true, true);
        if (this.configuration.scene && this.configuration.scene.debug) {
            this.scene.debugLayer.show();
        }
        return Promise.resolve(this.scene);
    }

    public loadModel(model: any = this.configuration.model, clearScene: boolean = true): Promise<Scene> {
        this.configuration.model = model;
        let modelUrl = (typeof model === 'string') ? model : model.url;
        let parts = modelUrl.split('/');
        let filename = parts.pop();
        let base = parts.join('/') + '/';
        let plugin = (typeof model === 'string') ? undefined : model.loader;

        return Promise.resolve(this.scene).then((scene) => {
            if (!scene || clearScene) return this.initScene();
            else return this.scene!;
        }).then(() => {
            return new Promise<Array<AbstractMesh>>((resolve, reject) => {
                this.lastUsedLoader = SceneLoader.ImportMesh(undefined, base, filename, this.scene, (meshes) => {
                    resolve(meshes);
                }, (progressEvent) => {
                    this.onModelLoadProgressObservable.notifyWithPromise(progressEvent);
                }, (e, m, exception) => {
                    // console.log(m, exception);
                    reject(m);
                }, plugin)!;
            });
        }).then((meshes: Array<AbstractMesh>) => {
            return this.onModelLoadedObservable.notifyWithPromise(meshes).then(() => {
                return this.scene;
            });
        });
    }
}