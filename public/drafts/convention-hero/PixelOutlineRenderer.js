import * as THREE from "three";

/** Low-resolution color + depth + normal passes, composited before nearest upscaling.
 * The normal override is Three's skinned MeshNormalMaterial, so edges follow animation.
 * Orthographic view-space depth thresholds are in world units, not device pixels.
 */
export class PixelOutlineRenderer {
  constructor(renderer, scene, camera) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.color = new THREE.WebGLRenderTarget(1, 1, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      type: THREE.HalfFloatType,
      depthTexture: new THREE.DepthTexture(1, 1),
    });
    this.normals = new THREE.WebGLRenderTarget(1, 1, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
    });
    this.normalMaterial = new THREE.MeshNormalMaterial();
    this.material = new THREE.ShaderMaterial({
      depthTest: false,
      depthWrite: false,
      uniforms: {
        colorMap: { value: this.color.texture },
        depthMap: { value: this.color.depthTexture },
        normalMap: { value: this.normals.texture },
        texel: { value: new THREE.Vector2() },
        cameraNear: { value: camera.near },
        cameraFar: { value: camera.far },
        outlineStrength: { value: 1 },
        creaseStrength: { value: 0.3 },
        ink: { value: new THREE.Color("#230D07") },
      },
      vertexShader: `varying vec2 vUv;
        void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`,
      fragmentShader: `
        uniform sampler2D colorMap, depthMap, normalMap;
        uniform vec2 texel;
        uniform float cameraNear,cameraFar,outlineStrength,creaseStrength;
        uniform vec3 ink;
        varying vec2 vUv;
        float depth(vec2 uv){return mix(cameraNear,cameraFar,texture2D(depthMap,uv).r);}
        vec3 normal(vec2 uv){return normalize(texture2D(normalMap,uv).rgb*2.-1.);}
        void main(){
          vec4 base=texture2D(colorMap,vUv);
          float z=depth(vUv);
          vec3 n=normal(vUv);
          float edge=0.,crease=0.,highlight=0.,silhouette=0.;
          for(int i=0;i<4;i++){
            vec2 dir=i==0?vec2(1,0):i==1?vec2(-1,0):i==2?vec2(0,1):vec2(0,-1);
            vec2 uv=vUv+dir*texel;
            float dz=depth(uv)-z;
            silhouette=max(silhouette,step(cameraFar-.01,depth(uv)));
            // Dark, one-pixel border on the foreground side of occlusion boundaries.
            float curvature=abs(dz+depth(vUv-dir*texel)-z);
            edge=max(edge,step(.105,dz)*step(.075,curvature));
            vec3 nn=normal(uv);
            float sharp=step(.24,1.-dot(n,nn));
            float sameSurface=1.-step(.11,abs(dz));
            // Bias a crease to one side, avoiding doubled borders and faceted wireframes.
            crease=max(crease,sharp*sameSurface*step(.08,dot(n-nn,vec3(.4,.7,.25))));
            highlight=max(highlight,sharp*sameSurface*step(.25,n.y)*step(.1,n.y-nn.y));
          }
          float foreground=1.-step(cameraFar-.01,z);
          edge*=foreground;crease*=foreground;highlight*=foreground;
          // Gentle RGB quantization maintains a restricted, stable pixel palette.
          vec3 color=base.rgb;
          color=mix(color,color+vec3(.09,.07,.025),highlight*.45*outlineStrength);
          float line=max(edge,crease*creaseStrength)*outlineStrength;
          vec3 lineColor=mix(color*.48,min(color*.42+ink*.40,ink),silhouette);
          color=mix(color,lineColor,line);
          gl_FragColor=vec4(color,base.a);
          #include <colorspace_fragment>
          gl_FragColor.rgb=floor(gl_FragColor.rgb*31.+.5)/31.;
        }`,
    });
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material);
    this.postScene = new THREE.Scene();
    this.postScene.add(this.quad);
    this.postCamera = new THREE.Camera();
  }
  setSize(width, height) {
    this.color.setSize(width, height);
    this.normals.setSize(width, height);
    this.material.uniforms.texel.value.set(1 / width, 1 / height);
  }
  render() {
    const r = this.renderer,
      s = this.scene;
    r.setRenderTarget(this.color);
    r.render(s, this.camera);
    const override = s.overrideMaterial,
      background = s.background;
    const shadowUpdate = r.shadowMap.autoUpdate;
    s.overrideMaterial = this.normalMaterial;
    s.background = new THREE.Color(0x8080ff);
    r.shadowMap.autoUpdate = false;
    r.setRenderTarget(this.normals);
    r.render(s, this.camera);
    s.overrideMaterial = override;
    s.background = background;
    r.shadowMap.autoUpdate = shadowUpdate;
    r.setRenderTarget(null);
    r.render(this.postScene, this.postCamera);
  }
  dispose() {
    this.color.dispose();
    this.normals.dispose();
    this.normalMaterial.dispose();
    this.material.dispose();
    this.quad.geometry.dispose();
  }
}
