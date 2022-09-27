export const standardDeviation = (array) => {
    const n = array.length
    const mean = array.reduce((a, b) => a + b) / n
    const dev =  Math.sqrt(array.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b) / n)
    return Math.round(dev)
  } 

  export const arithmeticMean = (x) => {
    const product = x.reduce((p, c) => p * c, 1);
    const exponent = 1 / x.length;
    return Math.round(Math.pow(product, exponent));
  };

  export const getUniqueListBy = (arr, key) => [...new Map(arr.map((item) => [item[key], item])).values()]



  export const akaLookup = (aka) => {
    const mapping = {
      "完颜啊骨打": "hainiu",
      "테드의뜨거운눈빛": "bonggo",
      "渺小之牛头人": "tiny tauren"
    }

    const name = mapping[aka] || null
    return name
  }