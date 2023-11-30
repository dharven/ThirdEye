function uploadImages() {
  let sourceImage = document.getElementById("sourceImage").files[0];
  let targetImage = document.getElementById("targetImage").files[0];

  console.log("Upload function");
  if (!sourceImage || !targetImage) {
    console.error("Both images need to be selected");
    return;
  }

  uploadToS3(sourceImage)
    .then((sourceImageKey) =>
      uploadToS3(targetImage).then((targetImageKey) => ({
        sourceImageKey,
        targetImageKey,
      }))
    )
    .then((keys) => {
      // Send the image keys to the Lambda function
      fetch(
        "https://428sf2blei.execute-api.us-east-1.amazonaws.com/face/face",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(keys),
        }
      )
        .then((response) => {
          console.log(response);
          return response.json();
        })
        .then((data) => displayResults(data))
        .catch((error) => console.error("Error:", error));
    })
    .catch((error) => console.error("Error during upload:", error));
}

function uploadToS3(file) {
  return getPresignedUrl(file).then((presignedUrl) => {
    return fetch(presignedUrl, {
      method: "PUT",
      headers: {
        "Content-Type": file.type,
      },
      body: file,
    }).then((response) => {
      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }
      return file.name; // Assuming the file name is used as the S3 key
    });
  });
}

function getPresignedUrl(file) {
  const apiUrl = `https://11tu8vb2zg.execute-api.us-east-1.amazonaws.com/url/url`;

  return fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      filename: file.name,
      filetype: file.type,
    }),
  })
    .then((response) => response.json())
    .then((data) => data.url);
}

function displayResults(data) {
  console.log(data);
  const resultsDiv = document.getElementById("results");

  // Clear previous results
  resultsDiv.innerHTML = "";

  // Dynamically create the results content
  data.FaceMatches.forEach((faceMatch) => {
    const comparisonContainer = document.createElement("div");
    comparisonContainer.className = "face-comparison";

    const sourceImg = document.createElement("img");
    sourceImg.src = "https://input-images-dh4.s3.amazonaws.com/source.jpg";
    comparisonContainer.appendChild(sourceImg);

    const equalitySign = document.createElement("div");
    equalitySign.className = "equality-sign";
    equalitySign.textContent = faceMatch.Similarity > 90 ? "=" : "≠";
    comparisonContainer.appendChild(equalitySign);

    const targetImg = document.createElement("img");
    targetImg.src = "https://input-images-dh4.s3.amazonaws.com/target.jpg";
    comparisonContainer.appendChild(targetImg);

    const similarityDiv = document.createElement("div");
    similarityDiv.className = "similarity";
    similarityDiv.textContent = `${faceMatch.Similarity.toFixed(1)} %`;
    comparisonContainer.appendChild(similarityDiv);

    const similarityBar = document.createElement("div");
    similarityBar.className = "similarity-bar";
    similarityBar.style.width = `${faceMatch.Similarity}%`;
    comparisonContainer.appendChild(similarityBar);

    resultsDiv.appendChild(comparisonContainer);
  });
}

document.getElementById("uploadForm").addEventListener("submit", (event) => {
  event.preventDefault();
  uploadImages();
});
