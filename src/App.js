import React, { useEffect, useRef, useState} from 'react';
import './App.css';
import soundURL from './assets/hey_sondn.mp3';
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-cpu';
import {Howl} from 'howler';
import { initNotifications, notify } from '@mycv/f8-notification';
import { VALID_DISTRIBUTION_VALUES } from '@tensorflow/tfjs-layers/dist/keras_format/initializer_config';
import * as mobilenet from '@tensorflow-models/mobilenet';
import * as knnClassifier from '@tensorflow-models/knn-classifier';
// const knnClassifier = require('@tensorflow-models/knn-classifier');
// const mobilenet = require('@tensorflow-models/mobilenet');
var sound = new Howl({
  src: [soundURL]
});


const NOT_TOUCH_LABEL = 'not_touch';
const TOUCHED_LABEL = 'touched';
const TRAINNING_TIME = 50;
const TOUCH_CONFIDENCE = 0.8;

function App() {

  const video = useRef();
  const classifier = useRef();
  const canPlaySound = useRef(true);
  const mobilenetModule = useRef();
  const [touched, setTouched] = useState(false);

  const init = async() => {
    console.log('init...');
    await setupCamera();
    console.log('success');

    classifier.current = knnClassifier.create();
    mobilenetModule.current = await mobilenet.load();

    console.log('setup success');
    console.log('Không chạm tay lên mặt và bấm Train 1');


  }

  const setupCamera = () => {
    return new Promise((resolve, reject)=> {
      navigator.getUserMedia = navigator.getUserMedia || 
        navigator.webkitGetUserMedia || 
        navigator.mozGetUserMedia || 
        navigator.mozGetUserMedia;

      if (navigator.getUserMedia) {
        navigator.getUserMedia(
          { video: true },
          stream => {
            video.current.srcObject = stream;
            video.current.addEventListener('loadeddata', resolve);
          },
          error => reject(error)
        );
      }
      else {
        reject();
      }
    });
  }

  const train = async label => {
    console.log(`[${label}] Đang train cho máy mặt của bạn`);
    
    for (let i = 0; i < TRAINNING_TIME; ++i) {
      console.log(`Progress ${parseInt((i+1)/ TRAINNING_TIME *100)}%`);
      await trainning(label);
    } 
  }

const trainning = label => {
  return new Promise(async resolve => {
    const embedding = mobilenetModule.current.infer(
      video.current,
      true
    );
    
    classifier.current.addExample(embedding, label);
    await sleep(100);
    resolve();
  });
}  

const run = async () => {
  const embedding = mobilenetModule.current.infer(
    video.current,
    true
  );
  const result = await classifier.current.predictClass(embedding);

  if (
      result.label === TOUCHED_LABEL &&
      result.confidences[result.label] > TOUCH_CONFIDENCE
  ) {
      console.log('Touched');
      if (canPlaySound.current) {
        sound.play();
        canPlaySound.current = false;
      }
     notify('Bỏ tay ra bạn ei', { body: 'bỏ tay raaaaaa' });
      setTouched(true);
  }
  else {
      console.log('Not touch');
      setTouched(false);
  }

  await sleep(200);
  run();
}

const sleep = (ms = 0) => {
  return new Promise(resolve => setTimeout(resolve, ms))
}


  useEffect(() => {
    init();

    sound.on('end', function(){
      canPlaySound.current = true;
    });

    return () => {

    }
  }, []);

  return (
    <div className={`main ${touched ? 'touched' : ''}`}>
        <video
          ref={video}
          className="video"
          autoPlay
        />

        <div className="control">
          <button className="btn" onClick={() => train(NOT_TOUCH_LABEL)}>Train 1</button>
          <button className="btn" onClick={() => train(TOUCHED_LABEL)}>Train 2</button>
          <button className="btn" onClick={() => run()}>Run</button>

        </div>
    </div>
  );
}

export default App;
