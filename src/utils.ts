export const shuffleArray = (arr) => arr.sort(() => Math.floor(Math.random() * 3) - 1);

export const uniqueArray = (arr) => arr.filter((value, index, self) => self.indexOf(value) === index);
