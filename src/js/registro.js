function registerVisit(event) {
    event.preventDefault();

    const name = document.getElementById("visitorName").value;
    const documentNumber = document.getElementById("documentNumber").value;

    console.log("Visitante:", name);
    console.log("Documento:", documentNumber);

    alert("Visita registrada correctamente");

    resetForm();
}

function resetForm() {
    document.getElementById("registerForm").reset();
}