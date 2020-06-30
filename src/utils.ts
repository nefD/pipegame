export const shuffleArray = (arr) => {
  for(let i = arr.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * i);
    const temp = arr[i];
    arr[i] = arr[j];
    arr[j] = temp;
  }
};

export const uniqueArray = (arr) => arr.filter((value, index, self) => self.indexOf(value) === index);
