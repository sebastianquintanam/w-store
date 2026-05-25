# Technical Test Context

## Purpose of the test

This project is a fullstack technical test intended to evaluate:

- Frontend development.
- Backend development.
- Code clarity.
- API and endpoint design.
- Database and information architecture.
- UI/UX simplicity.
- Correct use of HTTP.
- Test coverage.
- Data management.
- Infrastructure/deployment.
- Software development principles.
- Security and sensitive data handling.

The goal is to build a checkout/onboarding application where a customer buys a product using a sandbox payment provider.

---

# 1. General business process

The application must allow a customer to buy a product from a store.

The business flow is:

1. Show a product page.
2. Display product information:
   - Product name.
   - Description.
   - Price.
   - Available stock.
3. Show a button: “Pay with credit card”.
4. Open a modal or screen to request:
   - Credit card information.
   - Customer delivery information.
5. Validate the credit card data.
   - The card data must be fake.
   - The structure must follow valid credit card formats.
   - Visa and Mastercard logo/card detection is a plus.
6. Show a payment summary.
7. The summary must include:
   - Product amount.
   - Base fee, always added.
   - Delivery fee.
   - Total amount.
8. Show a payment button inside a summary/backdrop component.
9. When the user clicks the payment button:
   - Create a transaction in the backend with status PENDING.
   - Obtain a transaction number.
   - Call the sandbox payment API.
   - Once payment is completed or failed:
     - Update the transaction with the final result.
     - Assign the product delivery to the customer.
     - Update the product stock.
10. Finally:
   - Show the transaction result.
   - Redirect or return to the product page.
   - The product page must show the updated stock.

---

# 2. Required screen flow

The application must follow this 5-step business flow:

1. Product page.
2. Credit card and delivery information.
3. Summary.
4. Final status.
5. Product page with updated stock.

The app should allow the user to complete the checkout flow in a clear, simple, mobile-oriented interface.

---

# 3. Frontend requirements

## Framework

The frontend must be a Single Page Application, SPA.

Allowed frameworks:

- ReactJS.
- VueJS.

No other frontend frameworks are allowed.

## State management

The use of one of these is mandatory:

- Redux, if using React.
- Vuex, if using Vue.

The app should follow Flux architecture principles as much as possible.

## Design

The app must be mobile-oriented.

Requirements:

- Mobile-first design.
- Responsive behavior across different screen sizes.
- UI must fit correctly inside screen boundaries.
- UI interactions must work properly on small screens.
- Minimum reference device: iPhone SE 2020.
- The candidate can define the UX design.
- CSS frameworks are allowed.
- Use of Flexbox or CSS Grid is encouraged.

## Frontend behavior

The frontend must:

- Show the product and available stock.
- Allow checkout with credit card.
- Collect delivery information.
- Validate the form.
- Show a summary before payment.
- Show the final result.
- Return to the product page with updated stock.
- Recover the progress made by the client in case of refresh, where reasonable.
- Store payment transaction data securely in application state or localStorage.

## Sensitive data rule

The frontend must not expose or persist sensitive credit card data insecurely.

Do not store full credit card data permanently.

---

# 4. Backend requirements

## Allowed backend technologies

The backend must be implemented using:

- JavaScript / TypeScript, or
- Ruby.

Allowed backend frameworks include:

- NestJS.
- Grape.
- Sinatra.

Ruby on Rails and other frameworks are not allowed.

If rebuilding, NestJS with TypeScript is preferred.

## Architecture

Business logic must not be handled directly inside routing/controller layers.

The backend should separate responsibilities using layers such as:

- Controllers / routes.
- Use cases / services.
- Repositories.
- Adapters.
- External API clients.
- Database access layer.

Recommended patterns:

- Hexagonal Architecture.
- Ports and Adapters.
- Railway Oriented Programming, ROP, where reasonable.

## Required API domains

The backend API must include at least:

- Products.
- Stock.
- Transactions.
- Customers.
- Deliveries.

These resources should support different HTTP request types where appropriate.

Expected examples:

- GET product information.
- GET stock availability.
- POST create transaction.
- PATCH or PUT update transaction.
- POST create customer or customer data.
- POST create delivery.
- GET transaction result.

## Product creation

There is no need to create an endpoint to create new products.

The database must be seeded with dummy products.

## Database

Any database can be used.

Recommended databases:

- PostgreSQL.
- DynamoDB.

If using a relational database, the README should include the data model design.

ORMs and serialization libraries are allowed.

---

# 5. Payment flow requirements

The payment flow should work in sandbox mode only.

The app must not process real money.

The expected flow is:

1. Customer clicks payment button.
2. Backend creates a transaction with status PENDING.
3. Backend returns a transaction number or identifier.
4. Sandbox payment API is called to process the payment.
5. Payment succeeds or fails.
6. Backend updates the transaction result.
7. Backend creates or assigns the delivery.
8. Backend updates product stock.
9. Frontend shows the final payment status.
10. Frontend returns to product page with updated stock.

## Transaction statuses

The implementation should support statuses such as:

- PENDING.
- APPROVED.
- DECLINED.
- ERROR.
- FAILED, if needed.

## Stock behavior

Stock should only be reduced when the business rule allows it.

Recommended rule:

- Reduce stock only after an approved payment.
- Do not reduce stock if payment fails.
- Prevent purchase if stock is zero.
- Prevent stock from becoming negative.

---

# 6. Security requirements

The app must safely handle sensitive data.

Important rules:

- Do not commit secrets.
- Do not commit real `.env` files.
- Use `.env.example` for documentation.
- Use sandbox keys only through environment variables.
- Do not hardcode private keys in the code.
- Do not store full credit card numbers.
- Do not log full credit card data.
- Do not save CVV.
- If card data must be displayed, mask it.
- Use HTTPS in deployment if possible.
- Add security headers if possible.
- Follow basic OWASP recommendations.

Bonus points are available for:

- OWASP alignment.
- HTTPS.
- Security headers.

---

# 7. Testing requirements

Unit tests are mandatory for both:

- Frontend.
- Backend.

Coverage target:

- More than 80% coverage.

Testing tools:

- Jest is required or expected.
- Vitest may be acceptable for Vite frontend, but the project should document it clearly if used.

The README must include:

- How to run tests.
- How to run coverage.
- Coverage results.

Important areas to test:

## Backend

- Product/stock use cases.
- Transaction creation.
- Transaction status update.
- Stock update rules.
- Customer creation or validation.
- Delivery creation.
- Payment service behavior.
- Error handling.
- Invalid requests.
- Out-of-stock scenario.
- Failed payment scenario.

## Frontend

- Product page rendering.
- Payment button behavior.
- Credit card form validation.
- Delivery form validation.
- Summary calculation.
- Checkout flow.
- Final status rendering.
- Redux/store behavior.
- LocalStorage/progress recovery, if implemented.

---

# 8. README requirements

The README must be complete and professional.

It should include:

1. Project description.
2. Business flow explanation.
3. Tech stack.
4. Architecture explanation.
5. Folder structure.
6. Data model design.
7. API endpoints.
8. Postman collection link or Swagger URL.
9. Environment variables.
10. Local setup instructions.
11. Docker/database setup.
12. Backend commands.
13. Frontend commands.
14. Test commands.
15. Coverage results.
16. Deployment links.
17. Security considerations.
18. Known limitations, if any.

---

# 9. Postman or Swagger requirement

The project must include either:

- A Postman collection, or
- A public Swagger URL.

The documentation should allow reviewers to test the API easily.

Recommended Postman collection location:

```txt
docs/postman/checkout-api.postman_collection.json