// todo
// src/main.ts
document.addEventListener("DOMContentLoaded", () => {
    // Create a button element
    const button = document.createElement("button");
  
    // Set button properties
    button.textContent = "Click Me!";
    button.id = "myButton";
  
    // Append the button to the body or a specific container
    document.body.appendChild(button);
  
    // Add an event listener to the button
    button.addEventListener("click", () => {
        alert('you clicked the button!')
    });
  });
  
  