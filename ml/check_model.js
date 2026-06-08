const tf = require('@tensorflow/tfjs');
const tfn = require('@tensorflow/tfjs-node');

async function checkModel() {
    const handler = tfn.io.fileSystem('c:/surviliance system/frontend/public/model/model.json');
    const model = await tf.loadGraphModel(handler);
    console.log("Inputs:", model.inputs);
    console.log("Outputs:", model.outputs);
}

checkModel().catch(console.error);
