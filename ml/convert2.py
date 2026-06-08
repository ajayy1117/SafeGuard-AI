import sys
from unittest.mock import MagicMock

# Mock out tensorflow_hub entirely
sys.modules['tensorflow_hub'] = MagicMock()
sys.modules['tensorflow_decision_forests'] = MagicMock()

import numpy as np
np.object = object
np.complex = complex
try:
    np.bool = np.bool_
except AttributeError:
    pass

from tensorflowjs.converters.converter import pip_main

if __name__ == '__main__':
    sys.argv = ['tensorflowjs_converter', '--input_format=tf_saved_model', 'saved_model', 'tfjs_model']
    try:
        pip_main()
        print("Conversion successful!")
    except Exception as e:
        print("Conversion failed:", e)
