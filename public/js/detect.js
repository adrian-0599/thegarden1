const PET_CLASSES = new Set(['cat', 'dog', 'bird']);
const PERSON_CLASSES = new Set(['person']);

let modelPromise = null;

export function loadDetector() {
  if (!modelPromise) {
    modelPromise = cocoSsd.load({ base: 'lite_mobilenet_v2' });
  }
  return modelPromise;
}

export async function analyzeImage(imageSource) {
  const model = await loadDetector();
  const predictions = await model.detect(imageSource);

  const significant = predictions.filter((p) => p.score > 0.45);
  const pets = significant.filter((p) => PET_CLASSES.has(p.class));
  const people = significant.filter((p) => PERSON_CLASSES.has(p.class));
  const other = significant.filter(
    (p) => !PET_CLASSES.has(p.class) && !PERSON_CLASSES.has(p.class)
  );

  let sceneType = 'empty';
  let subject = null;

  if (pets.length > 0) {
    sceneType = 'pet';
    subject = pets.sort((a, b) => b.score - a.score)[0].class;
  } else if (people.length > 0) {
    sceneType = 'person';
    subject = 'guest';
  } else if (other.length > 0) {
    sceneType = 'object';
    subject = other.sort((a, b) => b.score - a.score)[0].class;
  }

  return {
    sceneType,
    subject,
    predictions: significant,
    isEmpty: sceneType === 'empty',
  };
}

export function buildPrompt(analysis) {
  const base =
    'A luxurious fine dining forest oasis restaurant scene, deep emerald greens, dappled sunlight through canopy, natural earth tones, serene and immersive, editorial food photography aesthetic, soft bokeh, premium atmosphere';

  if (analysis.sceneType === 'pet') {
    const petName = analysis.subject === 'cat' ? 'a cat' : analysis.subject === 'dog' ? 'a dog' : `a ${analysis.subject}`;
    return `${petName} peacefully resting in The Garden forest oasis restaurant, surrounded by lush tropical plants and warm ambient light, ${base}`;
  }

  if (analysis.sceneType === 'person') {
    return `An elegant guest enjoying a moment in The Garden forest oasis dining space, ${base}`;
  }

  if (analysis.sceneType === 'object') {
    return `A beautiful ${analysis.subject} placed on a natural stone table in The Garden forest oasis restaurant, ${base}`;
  }

  return `An empty serene table setting in The Garden forest oasis restaurant, morning light filtering through leaves, no people, ${base}`;
}
