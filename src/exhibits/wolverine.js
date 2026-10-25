import * as THREE from 'three';
import { Exhibit } from './exhibit.js';
import { cardGeometry } from './geometry.js';
import { colorTex, dataTex } from '../art/canvasKit.js';
import { rectifyPhoto } from '../art/simpsonsFrames.js';

const W = 1024, H = 1434;
const CARD_H = 0.26, CARD_W = CARD_H * 5 / 7;

// Coordinates are measured in the user's unchanged 960 x 1280 photographs.
// Only the actual ink is retained; the visible tabletop is never used as glass.
export const WOLVERINE_SOURCES = {
  front: {
    url: '/assets/marvel/wolverine-user-front.jpg',
    quad: [[145, 149], [796, 134], [818, 1099], [126, 1083]],
    silhouette: `M 441 183
      C 477 178 529 196 558 217 C 583 226 594 251 593 279
      C 593 320 570 364 554 396 L 555 467 C 557 507 549 543 549 579
      C 591 596 626 623 646 674 C 659 706 666 741 669 769
      L 678 684 C 693 718 704 761 707 801 C 725 833 734 876 728 916
      C 724 939 718 953 709 953 C 684 942 663 915 650 882 L 637 849
      C 627 889 617 910 590 914 C 535 912 455 869 400 825
      C 420 847 439 855 461 865 C 443 824 432 782 426 742 L 417 698 L 407 677
      C 357 675 302 649 272 618 L 247 590 C 242 614 253 637 251 660
      C 246 693 255 727 269 759 C 280 789 285 819 275 844
      L 264 858 C 248 863 229 854 215 835 C 207 811 200 776 186 747
      C 172 713 164 671 163 642 C 160 611 178 571 198 544
      L 202 522 C 191 508 189 489 192 478 L 222 469 L 232 458 L 246 476
      C 269 463 297 461 320 449 L 337 419 L 368 400 L 389 390
      L 394 347 L 421 394 C 422 352 430 310 444 286 L 458 279 L 477 308
      L 490 308 L 474 276 C 455 267 427 274 409 265
      C 390 260 384 241 389 220 C 399 201 420 190 441 183 Z`,
    details: [
      // Three separate raised claws; transparent gaps remain between them.
      'M 433 178 C 367 189 301 222 246 272 C 304 232 370 208 442 192 Z',
      'M 440 184 C 384 210 322 245 284 295 C 329 256 382 230 450 200 Z',
      'M 445 189 C 411 215 374 250 337 294 C 373 260 413 234 456 205 Z',
      // The lower claws extend over the title-strip logo.
      'M 228 840 C 232 890 267 953 306 990 L 320 985 C 276 928 252 879 247 847 Z',
      'M 243 845 C 250 900 278 956 323 999 L 334 995 C 289 939 267 893 259 851 Z',
      'M 258 847 C 270 907 301 964 339 1007 L 349 1003 C 314 948 287 898 273 843 Z',
      // Authentic opaque printed name strip, including Fleer Ultra seal.
      'M 239 939 L 815 947 L 817 1069 L 236 1056 Z',
    ],
  },
  back: {
    url: '/assets/marvel/wolverine-user-back.jpg',
    quad: [[146, 216], [768, 201], [795, 1144], [123, 1118]],
    silhouette: `M 469 247 C 491 240 511 248 523 267 L 528 288
      C 524 309 510 324 490 331 C 470 337 452 326 437 328 L 413 335
      L 402 357 L 420 379 C 428 360 439 346 448 344 L 465 346
      C 487 368 495 401 506 433 L 523 405 L 528 442 L 546 458
      C 562 475 567 491 580 503 L 605 511 L 630 518 C 657 511 686 520 708 536
      C 723 549 727 568 719 592 L 724 617 C 745 650 754 681 753 711
      C 752 754 733 793 719 824 C 710 849 703 874 689 894
      L 668 907 C 647 901 635 886 632 865 C 628 841 634 812 642 788
      C 653 757 643 729 636 708 L 615 680 C 585 704 546 724 504 721
      L 479 726 C 481 772 482 811 470 846 L 453 881
      C 442 896 426 907 410 912 C 455 901 492 886 515 872 C 477 906 405 937 350 948
      C 330 954 316 941 308 920 L 297 896 C 280 928 262 959 233 978
      L 219 985 C 207 964 205 934 209 908 C 211 875 220 849 226 825
      C 225 788 237 754 249 727 L 256 749 C 272 698 297 669 335 650
      L 359 634 L 371 603 L 371 550 L 371 496 L 377 455
      C 356 427 339 394 333 358 C 327 325 341 299 367 281
      C 399 259 436 248 469 247 Z`,
    details: [
      'M 516 268 C 571 281 627 302 665 330 C 616 308 562 294 524 285 Z',
      'M 518 280 C 567 298 610 321 640 352 C 593 323 554 308 521 295 Z',
      'M 515 294 C 546 312 581 335 601 359 C 562 335 538 322 510 308 Z',
      'M 652 882 C 636 940 604 996 578 1038 C 620 1008 659 944 668 896 Z',
      'M 666 886 C 655 951 624 1018 601 1060 C 640 1028 674 956 679 899 Z',
      'M 680 886 C 674 938 651 995 631 1034 C 670 1001 696 940 694 891 Z',
      'M 126 975 L 673 985 L 678 1102 L 122 1089 Z',
    ],
  },
};

function makeCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function loadImage(url) { return new Promise((resolve, reject) => {
  const img = new Image(); img.onload = () => resolve(img);
  img.onerror = () => reject(new Error(`Could not load ${url}`)); img.src = url;
}); }

export function wolverineInkTexture(image, definition) {
  const sourceMask = makeCanvas(image.width, image.height);
  const ctx = sourceMask.getContext('2d');
  ctx.fillStyle = 'black'; ctx.fillRect(0, 0, image.width, image.height);
  ctx.fillStyle = 'white'; ctx.fill(new Path2D(definition.silhouette));
  for (const d of definition.details) ctx.fill(new Path2D(d));
  return {
    map: rectifyPhoto(image, definition.quad, W, H),
    alpha: rectifyPhoto(sourceMask, definition.quad, W, H),
  };
}

function acetateTint(reverse = false) {
  const c = makeCanvas(W, H), x = c.getContext('2d');
  if (reverse) { x.translate(W, 0); x.scale(-1, 1); }
  // Printed purple film edge dissolves into amber dye in the clear acetate.
  const g = x.createLinearGradient(0, 0, W, 0);
  g.addColorStop(0, '#623f78'); g.addColorStop(0.21, '#79518e');
  g.addColorStop(0.34, '#b6a1b5'); g.addColorStop(0.49, '#eee6c8');
  g.addColorStop(0.72, '#f4edc7'); g.addColorStop(1, '#f0e5bd');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  // These are unprinted clear windows, not holes punched through the plastic.
  x.fillStyle = '#fff9e5';
  for (let i = 0; i < 15; i++) {
    x.beginPath(); x.roundRect(43, 60 + i * 90, 78, 43, 13); x.fill();
  }
  return colorTex(c);
}

function inkMaterial(art) {
  const map = colorTex(art.map), alphaMap = dataTex(art.alpha);
  return new THREE.MeshPhysicalMaterial({
    map, alphaMap, alphaTest: 0.48, side: THREE.FrontSide,
    roughness: 0.49, clearcoat: 0.16, clearcoatRoughness: 0.24,
    envMapIntensity: 0.45,
  });
}

export async function buildWolverineExhibit() {
  const [frontImage, backImage] = await Promise.all([
    loadImage(WOLVERINE_SOURCES.front.url), loadImage(WOLVERINE_SOURCES.back.url),
  ]);
  const front = wolverineInkTexture(frontImage, WOLVERINE_SOURCES.front);
  const back = wolverineInkTexture(backImage, WOLVERINE_SOURCES.back);
  const ex = new Exhibit({
    id: 'holoview', no: '02', title: 'Wolverine',
    finish: 'Fleer Ultra X-Men · Suspended Animation',
    desc: 'Gary Ciccarelli’s artwork printed on tinted clear acetate. Look through the amber field and film sprockets, then flip the card to see the actual reverse illustration and printed credits.',
    actions: [{ id: 'flip', label: 'Flip', key: 'F' }],
  });
  const clear = (map) => new THREE.MeshPhysicalMaterial({
    map, transmission: 0.94, thickness: 0.00065, roughness: 0.07,
    ior: 1.47, clearcoat: 0.35, clearcoatRoughness: 0.1,
    attenuationColor: new THREE.Color('#fff5db'), attenuationDistance: 0.1,
    envMapIntensity: 0.4, side: THREE.FrontSide,
  });
  const edge = new THREE.MeshPhysicalMaterial({ color: '#c4b8a2', transmission: 0.7,
    thickness: 0.00065, roughness: 0.14, ior: 1.47, envMapIntensity: 0.4 });
  const substrate = new THREE.Mesh(cardGeometry(CARD_W, CARD_H, 0.0008, 0.00065),
    [clear(acetateTint()), clear(acetateTint(true)), edge]);
  substrate.renderOrder = 0;
  ex.pivot.add(substrate); ex.addHit(substrate);

  for (const [art, reverse] of [[front, false], [back, true]]) {
    const material = inkMaterial(art);
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(CARD_W, CARD_H), material);
    mesh.position.z = reverse ? -0.0004 : 0.0004;
    if (reverse) mesh.rotation.y = Math.PI;
    mesh.castShadow = true; mesh.receiveShadow = true;
    mesh.customDepthMaterial = new THREE.MeshDepthMaterial({
      depthPacking: THREE.RGBADepthPacking, alphaMap: material.alphaMap, alphaTest: 0.48,
      side: THREE.FrontSide,
    });
    mesh.customDistanceMaterial = new THREE.MeshDistanceMaterial({
      alphaMap: material.alphaMap, alphaTest: 0.48, side: THREE.FrontSide,
    });
    ex.pivot.add(mesh); ex.addHit(mesh);
  }
  ex.inspect.scale = 2.3;
  return ex;
}
