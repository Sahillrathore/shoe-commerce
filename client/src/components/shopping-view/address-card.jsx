import { Button } from "../ui/button";
import { Card, CardContent, CardFooter } from "../ui/card";
import { Label } from "../ui/label";

function AddressCard({
  addressInfo,
  handleDeleteAddress,
  handleEditAddress,
  setCurrentSelectedAddress,
  selectedId,
}) {
  return (
    <Card
      onClick={
        setCurrentSelectedAddress
          ? () => setCurrentSelectedAddress(addressInfo)
          : null
      }
      className={`cursor-pointer border-red-700 mb-3 ${
        selectedId?._id === addressInfo?._id
          ? "border-red-900 border-[4px]"
          : "border-black"
      }`}
    >
      <CardContent className="grid sm:grid-cols-2 grid-cols-1 p-4 gap-3">
        <Label>City: {addressInfo?.city}</Label>
        <Label>pincode: {addressInfo?.pincode}</Label>
        <Label>Phone: {addressInfo?.phone}</Label>
        <Label className="leading-[1.2]">Address: {addressInfo?.address}</Label>
        {/* <Label>Notes: {addressInfo?.notes}</Label> */}
      </CardContent>
      <CardFooter className="p-3 pt-1 flex justify-between">
        <Button className="px-4 py-0 sm:mr-0 mr-4" onClick={() => handleEditAddress(addressInfo)}>Edit</Button>
        <Button className="px-4 py-0" onClick={() => handleDeleteAddress(addressInfo)}>Delete</Button>
      </CardFooter>
    </Card>
  );
}

export default AddressCard;
